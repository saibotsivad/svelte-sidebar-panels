<script>
	import { onMount } from 'svelte'
	import { createEventDispatcher } from 'svelte'

	export let open = false
	export let duration = 1 // 0.2
	export let placement = 'left'
	export let size = null
	export let scrim = true
	export let id

	let mounted = false
	$: style = `--duration: ${duration}s;${size ? ` --size: ${size};` : ''}`

	function scrollLock(open) {
		if (mounted) {
			const body = document.querySelector('body')
			body.style.overflow = open && scrim ? 'hidden' : 'auto'
		}
	}

	// $: scrollLock(open)

	const dispatch = createEventDispatcher()
	const handleClickAway = () => dispatch('clickAway')

	onMount(() => {
		mounted = true
		scrollLock(open)
	})
</script>

<style>
	aside {
		position: fixed;
		top: 0;
		left: 0;
		height: 100%;
		width: var(--size);
		z-index: -1;
		transition: z-index var(--duration) step-end;
	}

	aside.open {
		z-index: 99;
		transition: z-index var(--duration) step-start;
	}

	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(100, 100, 100, 0.5);
		opacity: 0;
		z-index: 2;
		transition: opacity var(--duration) ease;
	}

	aside.open .overlay {
		opacity: 1;
	}

	div {
		position: fixed;
		width: 100%;
		height: 100%;
		z-index: 3;
		transition: transform var(--duration) ease;
		overflow: auto;
	}

	div.left { left: 0; transform: translate(-100%, 0); }
	div.right { right: 0; transform: translate(100%, 0); }
	div.top { top: 0; transform: translate(0, -100%); }
	div.bottom { bottom: 0; transform: translate(0, 100%); }

	div.left.size, div.right.size { max-width: var(--size); }
	div.top.size, div.bottom.size { max-height: var(--size); }

	aside.open .panel {
		transform: translate(0, 0);
	}
</style>

<aside class:open {style} {id}>
	{#if scrim}
		<div class="overlay" on:click={handleClickAway}/>
	{/if}

	<div class="panel {placement}" class:size>
		<slot/>
	</div>
</aside>
