module.exports = function (api) {
  api.cache(true);

  // production build-এ console.log/info/debug মুছে ফেলি (defense-in-depth —
  // ভুলে কোনো PII লগ হলেও release বাইনারিতে যাবে না)। error/warn রেখে দিই —
  // logger.error ইচ্ছাকৃতভাবে production-এ crash report-এ যায়।
  const isProd = process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production';

  const plugins = [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
        },
      },
    ],
  ];

  if (isProd) {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }

  // reanimated plugin অবশ্যই সবার শেষে থাকতে হবে
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
