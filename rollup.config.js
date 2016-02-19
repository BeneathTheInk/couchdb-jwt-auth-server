import babel from "rollup-plugin-babel";
import string from 'rollup-plugin-string';

let plugins = [
	string({
		extensions: [".txt"]
	})
];

if (process.env.TARGET !== "es6") {
	plugins.push(babel({
		exclude: 'node_modules/**'
	}));
}

export default {
	onwarn: ()=>{},
	plugins: plugins
};
