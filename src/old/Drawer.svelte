<script>
	import { onMount } from 'svelte'

	export let open = true
	export let scrim = false
	export let panelId = 'sidebar-menu-id'
	export let contentId = 'sidebar-content-id'
	export let duration = 1 // 0.2
	export let placement = 'left'

	// These breakpoints are based on Bootstrap default layout breakpoints. I have found them
	// to be pretty solid values in my experience, but if you're using something else or a custom
	// theme with different breakpoints, you'll want to pass in a new map.
	export let breakpoints = {
		sm: 576,
		md: 768,
		lg: 992,
		xl: 1200,
		xxl: 1400
	}
	export let mobileBreakpoint = 'md'
	export let drawerSizes = {
		xs: '80%',
		sm: '480px',
		md: '300px',
		lg: '300px',
		xl: '300px',
		xxl: '300px'
	}

	const getBreakpoint = (pixels) => {
		if (pixels > breakpoints.xxl) return 'xxl'
		if (pixels > breakpoints.xl) return 'xl'
		if (pixels > breakpoints.lg) return 'lg'
		if (pixels > breakpoints.md) return 'md'
		if (pixels > breakpoints.sm) return 'sm'
		return 'xs'
	}

	let windowWidth = undefined
	let mounted = false

	function scrollLock(open) {
		if (mounted) {
			const body = document.querySelector('body')
			body.style.overflow = open && scrim ? 'hidden' : 'auto'
		}
	}

	$: breakpoint = getBreakpoint(windowWidth)
	$: drawerWidth = drawerSizes[breakpoint]
	$: scrim = windowWidth < breakpoints[mobileBreakpoint]
	$: margin = !open || windowWidth < breakpoints[mobileBreakpoint]
		? '0'
		: drawerSizes[breakpoint]
	$: contentMargin = `margin-${placement}: ${margin};`
	$: style = `--duration: ${duration}s; --width: ${margin};`

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
		width: var(--width);
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

	.content {
		position: fixed;
		width: 100%;
		height: 100%;
		z-index: 3;
		transition: margin var(--duration) ease;
		overflow: auto;
	}

	.panel.left { left: 0; transform: translate(-100%, 0); }
	.panel.right { right: 0; transform: translate(100%, 0); }

	/*.panel.width, .panel.width { width: var(--width); }*/

	aside.open .panel {
		transform: translate(0, 0);
	}
</style>

<svelte:window bind:innerWidth={windowWidth} />

<div {style}>
	<aside class:open id={panelId}>
		{#if scrim}
			<div class="overlay" on:click={ () => open = false }/>
		{/if}
		<div class="panel {placement}">
			<slot name="menu" />
		</div>
	</aside>

	<div class="content" style={contentMargin} id={contentId}>
		<slot name="content" />
	</div>
</div>
