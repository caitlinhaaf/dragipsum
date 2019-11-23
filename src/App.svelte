<script>
	import {safeWords, nsfw} from './phrases'
	import {numParagraphs, numSentences} from './stores.js'

	import LengthSelect from './LengthSelect.svelte'
	import NumParagraphsSelect from './NumParagraphSelect.svelte'

	let activeIpsum = []
	let nsfwMode = false

	$: allPhrases = nsfwMode ?  [...safeWords, ...nsfw] : [...safeWords];

	let numParagraphs_value, numSentence_value;
	const unsubscribeParagraphs = numParagraphs.subscribe(value => {
		numParagraphs_value = value;
	});
	const unsubscribeSentences = numSentences.subscribe(value => {
		numSentence_value = value;
	});

	function getIpsum(){
		let ipsum = []
		let i=0
		while(i<numParagraphs_value){
			ipsum = [...ipsum, `${buildParagraph(allPhrases)}`]
			i++
		}
		activeIpsum = ipsum;
	}

	function buildParagraph(){
		let paragraph = ``
		let i=0;
		while(i<numSentence_value){
			paragraph += `${buildSentence(allPhrases)}`
			i++;
		}
		return paragraph
	}

	function buildSentence(){
		let i=0;
		let sentence = ``;
		while(i<5){
			const phrase = allPhrases[Math.floor(allPhrases.length*Math.random())]
			sentence += `${i===0 ? ` ${phrase.charAt(0).toUpperCase()}` + phrase.substring(1) : phrase }${i===4 ? `.`  : ` `}`
			i++
		}
		return sentence;
	}
</script>

<main>
	<h1>Drag Race Ipsum</h1>

	<section class="twoCol">
		<NumParagraphsSelect/>
		
		<LengthSelect/>
	</section>

	<label>
		<input type=checkbox bind:checked={nsfwMode}>
		Add some Charisma, Uniqueness, Nerve, and Talent (NSFW)
	</label>

	<button on:click={getIpsum}>	
		Make Ipsum
	</button>

	<p>
		<!-- {activeIpsum} -->
		{#each activeIpsum as paragraph}
			<p>{paragraph}</p>
		{/each}
	</p>

</main>

<style>
	main {
		padding: 1em;
		width: 80%;
		max-width: 1000px;
		margin: 0 auto;
	}

	h1{
		/* color: #9900ff; */
		font-size: 4em;
		font-weight: 100;
		margin: 0;
	}
</style>