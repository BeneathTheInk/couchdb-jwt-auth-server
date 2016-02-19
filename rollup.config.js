import babel from "rollup-plugin-babel";
import string from 'rollup-plugin-string';

export default {
	onwarn: ()=>{},
	format: "cjs",
	plugins: [
		string({
			extensions: [".txt"]
		}),
		babel({
			exclude: 'node_modules/**'
		})
	]
};
