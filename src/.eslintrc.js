module.exports = {
  extends: '../.eslintrc.js',
  env: {
    node: true,
    browser: true,
  },
  parser: 'babel-eslint',
  rules: {
    'class-methods-use-this': 'off',
    'no-bitwise': 'off',
    'no-param-reassign': 'off',
    'no-plusplus': 'off',
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: false,
    }],
  },
};
