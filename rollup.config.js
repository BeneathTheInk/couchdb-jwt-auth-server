import babel from "rollup-plugin-babel";

export default {
	onwarn: ()=>{},
	format: "cjs",
	plugins: [
		babel({
			exclude: 'node_modules/**'
		})
	]
};
