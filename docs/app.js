import Sidebar from '../SidebarNavigationMenu.html'

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
	const sidebar = new Sidebar({
		target: document.querySelector('body'),
		data: {
			sidebarIsOpen: true
		}
	})
})
