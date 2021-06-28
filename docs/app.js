import { default as Demo } from '../src/demo/Demo.svelte'

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
	new Demo({
		target: document.querySelector('body'),
	})
})
