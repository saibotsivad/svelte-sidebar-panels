<script>
	import { createEventDispatcher, onMount } from 'svelte'
	const dispatch = createEventDispatcher()

	// To manually toggle the panels externally, e.g. your navigation
	// menu buttons, bind to this function and call it with whatever
	// panel you want to update. Setting left/right to undefined will
	// leave that panel unchanged. (See the demo for an example.)
	export const updatePanels = ({ left, right }) => {
		if (left !== undefined) { setLeft(!!left) }
		if (right !== undefined) { setRight(!!right) }
	}

	// The mobile breakpoint determines at what screen width to shift to mobile
	// behaviour. The two big changes are: 1) only the left or right panel are
	// allowed to be open, making one visible will hide the other, and 2) the
	// content panel slides to the side, instead of getting the width adjusted,
	// and a scrim/touch-panel is overlayed on the content, so that tapping it
	// will hide the panel. (Since you can never view a panel and the content
	// area, resizing the content only causes huge redraws, a waste of cycles.)
	export let mobileBreakpoint = 500

	// When in mobile mode the content area is overlayed with a touch area, called
	// a scrim (named after the theater drop), so that tapping it closes the panel.
	// You'll want to make sure this touch area is wide enough that people can
	// easily and accurately touch it. For minimums, Apple suggests 44px, Microsoft 24px,
	// Nokia 28px, Android 48px. In my experience, these are all way too small for
	// comfortable navigation.
	export let scrimWidth = '70px'

	// The scrim is given 50% opacity, so the content panel is still visible. You
	// can use the scrim color to re-brand the scrim, or to change to light/dark.
	export let scrimColor = '#444'

	// On screens that are big enough, you might want to initialize with the left
	// and/or right panels open. The default values here are based on Bootstrap
	// breakpoints, and I've found them to work pretty well across many different
	// applications and devices. Set these attributes on the <SidebarPanels> to an
	// integer of pixels, i.e. the breakpoint at which to change behaviour. If the
	// screen width is less than the value it will initialize with the panels closed.
	// To opt out of this behaviour, set the property to a falsey value.

	// These attributes control the window width at which the left/right panels will
	// automatically open (when resizing bigger) or automatically close (when resizing
	// smaller). These also control whether the component initializes with the panels
	// open or closed. To opt out of this behaviour, set the property to a falsey value.
	export let leftOpenBreakpoint = 768
	export let rightOpenBreakpoint = 1200

	// You can either set an overall width, or different widths for the left and
	// right panels. The width can be a string of any valid CSS "width" value.
	export let width = '250px'
	export let leftWidth
	export let rightWidth

	// Although it's possible to adjust the duration of the panel open/close animation,
	// you really probably shouldn't. Setting it too low will make the animation feel
	// jarring and induce stress in the user, while setting it too high will make it
	// feel sluggish and will frustrate the user. This value was tested across multiple
	// devices and with different application setups, and is the best compromise between
	// the too-slow/too-fast times.
	export let duration = '0.08s'

	// =============== end of exports ===============

	let windowWidth
	let leftOpen
	let leftTransitioning
	let rightOpen
	let rightTransitioning

	const setLeft = (open, transition = true) => {
		leftOpen = open
		leftTransitioning = transition
	}

	const setRight = (open, transition = true) => {
		rightOpen = open
		rightTransitioning = transition
	}

	const onTransitionEnd = ({ propertyName }) => {
		if (propertyName === 'left' || propertyName === 'width') {
			leftTransitioning = false
			rightTransitioning = false
			dispatch('change', { left: leftOpen, right: rightOpen })
		}
	}

	const setPanelStates = transition => () => {
		windowWidth = window.innerWidth
		if (leftOpenBreakpoint && windowWidth > leftOpenBreakpoint) { setLeft(true, transition) }
		if (rightOpenBreakpoint && windowWidth > rightOpenBreakpoint) { setRight(true, transition) }
		if (leftOpenBreakpoint && windowWidth < leftOpenBreakpoint) { setLeft(false, transition) }
		if (rightOpenBreakpoint && windowWidth < rightOpenBreakpoint) { setRight(false, transition) }
		dispatch('change', { left: leftOpen, right: rightOpen })
	}

	onMount(setPanelStates(false))

	const leftScrimOff = () => { setLeft(false) }
	const rightScrimOff = () => { setRight(false) }

	const commonStyles = `
		position: absolute;
		top: 0;
		bottom: 0;
		overflow-y: scroll;
	`

	$: mobileMode = windowWidth < mobileBreakpoint
	$: mobilePanelWidth = `calc(100% - ${scrimWidth})`

	const makeMenuStyle = (side, width, z) => `
		${commonStyles}
		${side}: 0;
		width: ${width};
		z-index: ${z};
	`
	$: leftMenuStyle = makeMenuStyle('left', mobileMode ? mobilePanelWidth : leftWidth || width, mobileMode && leftOpen ? '3' : '2')
	$: rightMenuStyle = makeMenuStyle('right', mobileMode ? mobilePanelWidth : rightWidth || width, mobileMode && rightOpen ? '2' : '1')

	const makeScrimStyle = (side, open, transitioning, color) => `
		${commonStyles}
		${side}: calc(100% - ${scrimWidth});
		width: ${scrimWidth};
		z-index: ${open && !transitioning ? '5' : '-1'};
		opacity: ${open && !transitioning && '0.5' || '0'};
		background-color: ${color};
	`
	$: leftScrimStyle = mobileMode && makeScrimStyle('left', leftOpen, leftTransitioning, scrimColor)
	$: rightScrimStyle = mobileMode && makeScrimStyle('right', rightOpen, rightTransitioning, scrimColor)

	$: contentLeft = mobileMode
		? (leftOpen && `calc(100% - ${scrimWidth})` || rightOpen && `calc(${scrimWidth} - 100%)` || '0px')
		: (leftOpen ? (leftWidth || width) : '0px')
	$: contentWidth = mobileMode
		? '100%'
		: `calc(100% - ${leftOpen ? (leftWidth || width) : '0px'} - ${rightOpen ? (rightWidth || width) : '0px'})`
	$: contentStyle = `
		${commonStyles}
		left: ${contentLeft};
		width: ${contentWidth};
		transition: width ${duration} ease-in-out, left ${duration} ease-in-out;
		z-index: 5;
	`
</script>

<svelte:window on:resize={setPanelStates(true)}/>

<!--
The side panels being visually "under" the main content is a deliberate choice, based on
a handful of UX tests performed on non-technical internet users. The content should appear
to slide to the left/right to expose the panel underneath.
-->

<div style="position: absolute; top: 0; bottom: 0; left: 0; right: 0; overflow-x: hidden;">
	{#if $$slots.left}
		<div style="{leftMenuStyle}">
			<slot name="left" />
		</div>
	{/if}

	<div style={contentStyle} on:transitionend={onTransitionEnd}>
		<slot name="content" />
	</div>

	{#if $$slots.right}
		<div style="{rightMenuStyle}">
			<slot name="right" />
		</div>
	{/if}

	{#if $$slots.left && mobileMode}
		<div style={leftScrimStyle} on:click={leftScrimOff}></div>
	{/if}

	{#if $$slots.right && mobileMode}
		<div style={rightScrimStyle} on:click={rightScrimOff}></div>
	{/if}
</div>
