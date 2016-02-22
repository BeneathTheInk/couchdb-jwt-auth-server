import babel from 'rollup-plugin-babel';

export default {
  onwarn() {},
  plugins: [
    babel({
      exclude: 'node_modules/**'
    })
  ]
};
