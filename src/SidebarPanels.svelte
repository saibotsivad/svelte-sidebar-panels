<script>
	import { onMount } from 'svelte'

	// You should bind to these, and toggle them by user input, but typically
	// you shouldn't give them an initial value: if the page is initialized on
	// a small screen, e.g. a mobile device, the left/right panels will initialize
	// as being closed. This is typically the best behaviour on mobile devices.
	export let leftOpen
	export let rightOpen

	// On screens that are big enough, you might want to initialize with the left
	// and/or right panels open. The default values here are based on Bootstrap
	// breakpoints, and I've found them to work pretty well across many different
	// applications and devices. Set these attributes on the <SidebarPanels> to an
	// integer of pixels, i.e. the breakpoint at which to change behaviour. If the
	// screen width is less than the value it will initialize with the panels closed.
	// To opt out of this behaviour, set the property to a falsey value.
	export let leftOpenBreakpoint = 768
	export let rightOpenBreakpoint = 1200
	const resizeToggle = () => {
		if (leftOpenBreakpoint && window.innerWidth > leftOpenBreakpoint) { leftOpen = true }
		if (rightOpenBreakpoint && window.innerWidth > rightOpenBreakpoint) { rightOpen = true }
		if (leftOpenBreakpoint && window.innerWidth < leftOpenBreakpoint) { leftOpen = false }
		if (rightOpenBreakpoint && window.innerWidth < rightOpenBreakpoint) { rightOpen = false }
	}
	onMount(resizeToggle)

	// You can either set an overall width, or different widths for the left and
	// right panels. The width must be a valid CSS "width" string.
	export let width = '200px'
	export let leftWidth
	export let rightWidth

	// Although it's possible to adjust the duration of the panel open/close animation,
	// you really probably shouldn't. Setting it too low will make the animation feel
	// jarring and induce stress in the user, while setting it too high will make it
	// feel sluggish and will frustrate the user. This value was tested across multiple
	// devices and with different application setups, and is the best compromise between
	// the too-slow/too-fast times.
	export let duration = '0.08s'

	const makeMenuStyle = (side, width) => `
		position: absolute;
		top: 0;
		bottom: 0;
		${side}: 0;
		width: ${width};
	`

	$: leftSpacingWidth = leftOpen ? (leftWidth || width) : '0px'
	$: rightSpacingWidth = rightOpen ? (rightWidth || width) : '0px'
	$: contentNegativeWidth = `${leftSpacingWidth} - ${rightSpacingWidth}`

	$: leftMenuStyle = makeMenuStyle('left', leftWidth || width)
	$: rightMenuStyle = makeMenuStyle('right', rightWidth || width)
	$: contentStyle = `
		position: absolute;
		top: 0;
		bottom: 0;
		left: ${leftSpacingWidth};
		width: calc(100% - ${contentNegativeWidth});
		transition: width ${duration} ease-in-out, left ${duration} ease-in-out;
	`
</script>

<svelte:window on:resize={resizeToggle}/>

<!--
The side panels being "under" the main content is a deliberate choice, based on a handful
of UX tests performed on non-technical internet users. The content should appear to slide
to the left/right to expose the panel underneath.
-->

{#if $$slots.left}
	<div style="{leftMenuStyle}">
		<slot name="left" />
	</div>
{/if}

{#if $$slots.right}
	<div style="{rightMenuStyle}">
		<slot name="right" />
	</div>
{/if}

<div style={contentStyle}>
	<slot name="content" />
</div>
