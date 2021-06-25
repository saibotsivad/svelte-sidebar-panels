import svelte from 'rollup-plugin-svelte'
import resolve from '@rollup/plugin-node-resolve'
import css from 'rollup-plugin-css-only'
import livereload from 'rollup-plugin-livereload'
import pkg from './package.json'

const watch = process.env.ROLLUP_WATCH

const plugins = [
	svelte(),
	resolve(),
]

export default [
	!watch && {
		input: 'src/index.js',
		output: [
			{ file: pkg.module, 'format': 'es' },
			{ file: pkg.main, 'format': 'umd', name: 'SidebarNavigationMenu' },
		],
		plugins
	},
	{
		input: 'docs/app.js',
		output: {
			sourcemap: true,
			format: 'iife',
			dir: 'docs/build',
		},
		plugins: [
			...plugins,
			css({ output: 'bundle.css' }),
			watch && livereload('docs/build'),
		]
	}
]
