/**
 * aiService.ts
 * AI Feature Layer — RideShare AIUB
 *
 * Features:
 *  1. Smart Ride Suggestions — time-of-day + history-based destination prediction
 *  2. Dynamic Fare Insight   — tells user if fare is above/below average for this route
 *  3. Partner Safety Score   — AI-weighted trust score (rating + rides + completion)
 *  4. Peak Time Predictor    — predicts busy windows at campus for the current day
 *  5. Ride Match Ranker      — re-ranks nearby riders by composite AI score
 *  6. Smart ETA              — estimates rickshaw time using distance + peak factor
 *
 * Zero external API dependency — all inference runs locally on-device using
 * lightweight heuristic models trained on the app's domain knowledge.
 * (Can be replaced with a real ML model / Gemini API call later.)
 */

import { getDoc, getDocs, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { DESTINATIONS, Destination } from '@/constants/destinations';
import { FARE_TABLE } from '@/constants/fareTable';
import type { User } from '@/types/auth.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmartSuggestion {
  destinationId: string;
  destinationName: string;
  destinationNameBn: string;
  confidence: number;      // 0-1
  reason: string;
  baseFare: number;
  splitFare: number;
}

export interface FareInsight {
  fare: number;
  average: number;
  status: 'normal' | 'above_average' | 'below_average';
  label: string;
  savingsVsSolo: number;
}

export interface PartnerScore {
  userId: string;
  score: number;          // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  factors: {
    ratingScore: number;
    experienceScore: number;
    completionScore: number;
    badgeBonus: number;
  };
  recommendation: string;
}

export interface PeakWindow {
  startHour: number;
  endHour: number;
  label: string;
  intensity: 'low' | 'medium' | 'high' | 'very_high';
  color: string;
}

export interface RankedRider {
  userId: string;
  aiScore: number;
  matchStrength: 'perfect' | 'good' | 'fair';
  highlights: string[];
}

export interface SmartETA {
  minutes: number;
  range: string;         // e.g. "12–18 min"
  peakAdjusted: boolean;
}

// ─── Peak hours model (AIUB campus traffic patterns) ─────────────────────────

const PEAK_WINDOWS: PeakWindow[] = [
  { startHour: 7,  endHour: 9,  label: 'Morning Rush',   intensity: 'high',      color: '#FF7043' },
  { startHour: 11, endHour: 13, label: 'Lunch Break',    intensity: 'very_high', color: '#E53935' },
  { startHour: 15, endHour: 17, label: 'Afternoon Peak', intensity: 'high',      color: '#FF7043' },
  { startHour: 19, endHour: 21, label: 'Evening Rush',   intensity: 'medium',    color: '#FFA726' },
];

// Typical destination popularity by hour bucket (0=midnight .. 23=11pm)
const DESTINATION_POPULARITY: Record<string, number[]> = {
  kuril:       [0,0,0,0,0,0,1,3,5,3,2,4,5,4,3,5,4,3,3,2,2,1,1,0],
  badda:       [0,0,0,0,0,0,1,2,4,2,1,3,4,3,2,4,3,2,2,1,1,0,0,0],
  rampura:     [0,0,0,0,0,0,0,1,3,2,1,2,3,3,2,3,3,2,2,1,1,0,0,0],
  notun_bazar: [0,0,0,0,0,0,1,2,3,2,1,3,3,2,2,3,2,2,1,1,0,0,0,0],
  gulshan:     [0,0,0,0,0,0,0,1,2,1,1,2,3,3,2,3,3,2,2,1,1,0,0,0],
  banani:      [0,0,0,0,0,0,0,1,2,1,0,1,2,2,1,2,2,1,1,1,0,0,0,0],
  uttara:      [0,0,0,0,0,0,1,2,4,3,2,3,4,3,2,3,3,2,2,1,1,0,0,0],
};

// ─── Service ─────────────────────────────────────────────────────────────────

class AIService {

  // ── 1. Smart Suggestions ──────────────────────────────────────────────────

  /**
   * Predict the top 2 destination suggestions for this user right now.
   * Uses: hour of day, user's ride history, and global campus patterns.
   */
  async getSmartSuggestions(userId: string, pickupId: string): Promise<SmartSuggestion[]> {
    const hour = new Date().getHours();

    // Fetch user's last 10 rides
    let userHistory: Record<string, number> = {};
    try {
      const q = query(
        collection(db, 'rides'),
        where('rider1', '==', userId),
        orderBy('confirmedAt', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const dest = d.data().destination;
        userHistory[dest] = (userHistory[dest] ?? 0) + 1;
      });
    } catch { /* no history yet */ }

    const scored = DESTINATIONS.map((dest) => {
      const popularity = DESTINATION_POPULARITY[dest.id]?.[hour] ?? 1;
      const historyWeight = (userHistory[dest.id] ?? 0) * 2;
      const totalScore = popularity + historyWeight;

      const fare = FARE_TABLE[`${pickupId}_${dest.id}`] ?? dest.baseFare;
      const splitFare = Math.ceil(fare / 2);

      let reason = '';
      if (historyWeight > 0) reason = 'তুমি এখানে প্রায়ই যাও';
      else if (popularity >= 4) reason = 'এখন অনেক students যাচ্ছে';
      else reason = `${dest.estimatedTime} min দূরে`;

      return {
        destinationId: dest.id,
        destinationName: dest.name,
        destinationNameBn: dest.nameBn,
        confidence: Math.min(totalScore / 8, 1),
        reason,
        baseFare: fare,
        splitFare,
      };
    });

    return scored
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  // ── 2. Fare Insight ───────────────────────────────────────────────────────

  /**
   * Compare current fare against historical average for this route.
   */
  getFareInsight(pickupId: string, destinationId: string): FareInsight {
    const fare    = FARE_TABLE[`${pickupId}_${destinationId}`] ?? 40;
    const dest    = DESTINATIONS.find((d) => d.id === destinationId);
    const average = dest?.baseFare ?? fare;
    const split   = Math.ceil(fare / 2);
    const diff    = fare - average;

    let status: FareInsight['status'] = 'normal';
    let label = 'স্বাভাবিক ভাড়া';

    if (diff > 5) {
      status = 'above_average';
      label  = `গড়ের চেয়ে ৳${diff} বেশি`;
    } else if (diff < -5) {
      status = 'below_average';
      label  = `আজ সস্তা! ৳${Math.abs(diff)} কম`;
    }

    return {
      fare,
      average,
      status,
      label,
      savingsVsSolo: fare - split,
    };
  }

  // ── 3. Partner Safety Score ───────────────────────────────────────────────

  /**
   * Compute an AI-weighted trust score for a potential ride partner.
   * Score 0-100, grade A+ to D.
   */
  async getPartnerScore(targetUserId: string): Promise<PartnerScore> {
    let userData: Partial<User> = {
      rating: 4.0,
      totalRides: 0,
      completionRate: 80,
      badge: 'New Rider',
    };

    try {
      const snap = await getDoc(
        (await import('firebase/firestore')).doc(db, 'users', targetUserId)
      );
      if (snap.exists()) userData = snap.data() as User;
    } catch { /* use defaults */ }

    // Rating: 0-40 points (rating 1-5 → 0-40)
    const ratingScore = Math.round(((userData.rating ?? 4) - 1) / 4 * 40);

    // Experience: 0-30 points (0→0, 50+→30)
    const rides = userData.totalRides ?? 0;
    const experienceScore = Math.round(Math.min(rides / 50, 1) * 30);

    // Completion rate: 0-25 points
    const completion = userData.completionRate ?? 80;
    const completionScore = Math.round((completion / 100) * 25);

    // Badge bonus: 0-5 points
    const badgeBonus =
      userData.badge === 'Elite Rider' ? 5 :
      userData.badge === 'Trusted'     ? 3 :
      userData.badge === 'Regular'     ? 1 : 0;

    const score = ratingScore + experienceScore + completionScore + badgeBonus;

    const grade =
      score >= 90 ? 'A+' :
      score >= 75 ? 'A'  :
      score >= 60 ? 'B'  :
      score >= 40 ? 'C'  : 'D';

    const recommendation =
      grade === 'A+' ? 'অত্যন্ত নির্ভরযোগ্য — নির্দ্বিধায় যাও' :
      grade === 'A'  ? 'ভালো rider, নিরাপদ choice' :
      grade === 'B'  ? 'ঠিকঠাক, সতর্ক থাকো' :
      grade === 'C'  ? 'নতুন rider, বিবেচনা করো' :
                       'কম rating — সাবধান';

    return {
      userId: targetUserId,
      score,
      grade,
      factors: { ratingScore, experienceScore, completionScore, badgeBonus },
      recommendation,
    };
  }

  // ── 4. Peak Time Predictor ────────────────────────────────────────────────

  getCurrentPeakInfo(): { isPeak: boolean; window: PeakWindow | null; nextPeak: PeakWindow | null } {
    const hour = new Date().getHours();

    const current = PEAK_WINDOWS.find((w) => hour >= w.startHour && hour < w.endHour) ?? null;
    const next    = PEAK_WINDOWS.find((w) => w.startHour > hour) ?? null;

    return { isPeak: !!current, window: current, nextPeak: next };
  }

  getPeakWindows(): PeakWindow[] {
    return PEAK_WINDOWS;
  }

  // ── 5. AI Match Ranker ────────────────────────────────────────────────────

  /**
   * Re-rank a list of nearby riders using composite AI score.
   */
  async rankRiders(
    riders: Array<{
      userId: string;
      rating: number;
      totalRides?: number;
      badge?: string;
      distance: number;
      isMatch: boolean;
    }>
  ): Promise<RankedRider[]> {
    return riders.map((r) => {
      // Distance score: closer is better (max 30 pts for distance 0m)
      const distScore = Math.max(0, 30 - (r.distance / 1));

      // Rating score (0-35 pts)
      const ratingScore = ((r.rating - 1) / 4) * 35;

      // Experience (0-20 pts)
      const expScore = Math.min((r.totalRides ?? 0) / 50, 1) * 20;

      // Match bonus (15 pts for same destination)
      const matchBonus = r.isMatch ? 15 : 0;

      const aiScore = Math.round(distScore + ratingScore + expScore + matchBonus);

      const matchStrength: RankedRider['matchStrength'] =
        aiScore >= 75 ? 'perfect' :
        aiScore >= 50 ? 'good'    : 'fair';

      const highlights: string[] = [];
      if (r.isMatch)                  highlights.push('Same destination');
      if (r.rating >= 4.5)            highlights.push(`${r.rating} star rated`);
      if ((r.totalRides ?? 0) >= 20)  highlights.push('Experienced rider');
      if (r.distance <= 15)           highlights.push('Very close');

      return { userId: r.userId, aiScore, matchStrength, highlights };
    }).sort((a, b) => b.aiScore - a.aiScore);
  }

  // ── 6. Smart ETA ─────────────────────────────────────────────────────────

  getSmartETA(destinationId: string): SmartETA {
    const dest = DESTINATIONS.find((d) => d.id === destinationId);
    const base = dest?.estimatedTime ?? 15;
    const { isPeak } = this.getCurrentPeakInfo();

    const factor    = isPeak ? 1.4 : 1.0;
    const estimated = Math.round(base * factor);
    const low       = Math.round(estimated * 0.8);
    const high      = Math.round(estimated * 1.2);

    return {
      minutes: estimated,
      range: `${low}–${high} min`,
      peakAdjusted: isPeak,
    };
  }
}

export default new AIService();
