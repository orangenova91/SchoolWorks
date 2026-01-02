module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated 플러그인은 사용하는 경우에만 활성화
      // 'react-native-reanimated/plugin',
    ],
  };
};

