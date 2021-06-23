import { default as Demo } from '../src/Demo.svelte'

const onReady = callback => {
	const state = document.readyState
	if (state === 'complete' || state === 'interactive') {
		setTimeout(callback, 0)
	} else {
		document.addEventListener('DOMContentLoaded', () => {
			callback()
		})
	}
}

onReady(() => {
	const demo = new Demo({
		target: document.querySelector('body'),
	})
	demo.$on('foo', ({ detail }) => {
		console.log('foo', detail)
	})
})
