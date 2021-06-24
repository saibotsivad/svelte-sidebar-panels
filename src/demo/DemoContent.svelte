<script>
	const longTextThings = [
		`Level the playing field turn the crank time vampire yet critical mass one-sheet we need this overall to be busier and more active are there any leftovers in the kitchen? Organic growth keep it lean, nor best practices dunder mifflin we need to crystallize a plan.`,
		`Let's schedule a standup during the sprint to review our kpis who's responsible for the ask for this request? tbrand terrorists, for personal development 4-blocker and blue sky those options are already baked in with this model.`,
		`Nail it down execute gain traction, we need distributors to evangelize the new line to local markets cross sabers. On this journey throughput so digitalize, nor note for the previous submit: the devil should be on the left shoulder future-proof prethink.`,
		`Move the needle overcome key issues to meet key milestones sacred cow, for locked and loaded, but productize. High-level five-year strategic plan thinking outside the box, yet one-sheet, t-shaped individual nor move the needle, paddle on both sides.`,
		`Per my previous email tread it daily. Parallel path synergize productive mindfulness or cannibalize let's see if we can dovetail these two projects rock Star/Ninja, and cross-pollination low-hanging fruit.`,
		`Beef up let me know if you need me to crack any skulls and your work on this project has been really impactful, but run it up the flagpole, ping the boss and circle back. Sea change deploy where the metal hits the meat but rock Star/Ninja UI, or low engagement hard stop.`,
		`Today shall be a cloudy day, thanks to blue sky thinking, we can now deploy our new ui to the cloud incentivization yet move the needle after I ran into Helen at a restaurant, I realized she was just office pretty, nor on this journey.`,
		`It's a simple lift and shift job build on a culture of contribution and inclusion golden goose, run it up the flagpole, ping the boss and circle back, yet groom the backlog. Commitment to the cause do i have consent to record this meeting or bells and whistles, yet finance yet closer to the metal.`,
		`Let's take this conversation offline come up with something buzzworthy. Note for the previous submit: the devil should be on the left shoulder great plan! let me diarize this, and we can synchronise ourselves at a later timepoint yet pass the mayo, appeal to the client, sue the vice president reach out, for viral engagement, but we can't hear you into the weeds.`,
		`Punter nail it down, but nobody's fault it could have been managed better but can we take this offline, and move the needle open door policy please use "solutionise" instead of solution ideas! :). Back of the net baseline you must be muted for we’re starting to formalize flexible opinions around our foundations and pipeline lift and shift.`,
		`It's not hard guys. Product management breakout fastworks product market fit yet to be inspired is to become creative, innovative and energized we want this philosophy to trickle down to all our stakeholders my grasp on reality right now is tenuous, and who's the goto on this job with the way forward.`,
		`Value-added we need to build it so that it scales, powerPointless loop back put a record on and see who dances, for synergestic actionables conversational content . If you want to motivate these clowns, try less carrot and more stick spinning our wheels turn the crank, nor pushback, or message the initiative.`,
		`Get six alpha pups in here for a focus group it is all exactly as i said, but i don't like it, or ultimate measure of success, but please use "solutionise" instead of solution ideas! :) Q1. Imagineer show pony re-inventing the wheel.`,
		`Locked and loaded five-year strategic plan, pushback, so translating our vision of having a market leading platfrom note for the previous submit: the devil should be on the left shoulder but ultimate measure of success. A better understanding of usage can aid in prioritizing future efforts we need this overall to be busier and more active.`,
	]

	let count = 1
	$: lorem = new Array(count).fill('').map((_,index) => longTextThings[index % longTextThings.length])
</script>

<div class="card mt-3 mb-3">
	<div class="card-body">
		<p>
			Filler content generated using <a href="http://officeipsum.com/">OfficeIpsum</a>.
		</p>
		<p>
			Paragraphs ({count})
		</p>
		<div class="btn-group" role="group" aria-label="Toggle panels">
			<button type="button" class="btn btn-primary" on:click={() => count++}>
				+
			</button>
			<button type="button" class="btn btn-primary" on:click={() => { if (count) { count-- } } }>
				-
			</button>
		</div>
	</div>
</div>

{#each lorem as ipsum}
	<p>{ipsum}</p>
{/each}
