<script>
	let sidebarIsOpen = false

	$: expanded = sidebarIsOpen ? 'true' : 'false'

	const toggle = () => sidebarIsOpen = !sidebarIsOpen
</script>

<style>
	:global(html) { padding: 0; margin: 0; }
	:global(body) { padding: 0; margin: 0; }

	.container {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
	}
	#titlebar {
		display: flex;
	}
	#sidebar-opener {
		flex-basis: 50px;
	}
	#title {
		flex: 2;
	}
	button {
		border: none;
		padding: 0;
		margin: 0;
		background-color: transparent;
	}

	/* small and medium screens */
	@media all and (max-width: 800px) {
		#sidebar-menu[aria-expanded=false] {
			display: none;
		}
		#sidebar-menu[aria-expanded=true] {
			position: absolute;
			top: 0;
			left: 0;
			bottom: 0;
			right: 0;
			display: flex;
		}
		#sidebar-menu-content-area {
			flex: 2;
		}
		#sidebar-close-control {
			flex-basis: 50px;
		}
	}

	/* medium screens */
	@media all and (min-width: 600px) {
		#sidebar-close-control {
			flex-basis: 200px;
		}
	}

	/* large screens */
	@media all and (min-width: 800px) {
		.container {
			display: flex;
		}
		#sidebar-menu-content-area {
			flex-basis: 200px;
		}
		#sidebar-close-control, #sidebar-opener {
			display: none;
		}
		#content {
			flex: 2;
		}
	}
</style>

<div class="container">
	<div id="sidebar-menu" aria-expanded={expanded}>
		<div id="sidebar-menu-content-area">
			<div class="slot slot-sidebar">
				this sidebar can be whatever
			</div>
		</div>
		<button
			type="button"
			id="sidebar-close-control"
			on:click={toggle}
			on:keypress={toggle}
			aria-controls="sidebar-menu"
			aria-label="toggle sidebar menu"
			aria-expanded={expanded}
		>
		</button>
	</div>
	<div id="content">
		<div id="titlebar">
			<!-- the opener button is hidden on wide enough screens -->
			<button
				id="sidebar-opener"
				on:click={toggle}
				on:keypress={toggle}
				aria-controls="sidebar-menu"
				aria-label="toggle sidebar menu"
				aria-expanded={expanded}
			>
				<slot name="opener">
					<!-- default is the hamburger icon -->
					&#9776;
				</slot>
			</button>
			<div id="title">
				<slot name=""></slot>
				<div class="slot slot-titlebar">
					this part is always visible
				</div>
			</div>
		</div>
		<div id="main">
			<div class="slot slot-main-content">
				this is where the main content goes
			</div>
		</div>
	</div>
</div>
