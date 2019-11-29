<script>
	import {safeWords, nsfw} from './phrases'
	import {numParagraphs, numSentences, nsfwMode} from './stores.js'

	import LengthSelect from './LengthSelect.svelte'
	import NumParagraphsSelect from './NumParagraphSelect.svelte'
	import NSFWcheck from './NSFWcheck.svelte'

	let activeIpsum = []
	$: allPhrases = nsfwMode ?  [...safeWords, ...nsfw] : [...safeWords];

	let numParagraphs_value, numSentence_value;
	numSentences.subscribe(value => {
        numSentence_value = value;
	})
	numParagraphs.subscribe(value => {
        numParagraphs_value = value;
    })

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

	<NSFWcheck/>

	<button on:click={getIpsum}>	
		Make Ipsum
	</button>

	<section 
		class="ipsumContainer"
		class:active="{activeIpsum.length >= 1}"
	>
		<button class="copyBtn">Copy Text</button>

		{#each activeIpsum as paragraph}
			<p>{paragraph}</p>
		{/each}
	</section>

	<footer>
		<span>Created by <a href="http://www.caitlinhaaf.com" target="_blank" rel="noopener noreferrer">Caitlin Haaf</a></span>
		<span>View code on <a href="https://github.com/caitlinhaaf/dragipsum" target="_blank" rel="noopener noreferrer">Github</a></span>
		<div>
			<a class="twitter-share-button"
			href="https://twitter.com/intent/tweet?text=Hello%20world" data-size="large">
			Tweet</a>
			<span>Share on Twitter</span>
		</div>
		
	</footer>

</main>

<style>
	main {
		padding: 1em;
		width: 80%;
		max-width: 800px;
		margin: 0 auto;
	}
	button{
		display: block;
		margin: .5rem auto;
		min-width: 15rem;
	}
	.ipsumContainer{
		opacity: 0;
		padding: 0 2rem;
		color: #430c68;
		background-color: white;
		border-radius: 1rem;
		margin: 1rem 0;
	}
	.active{
		opacity: 1;
		padding: 1rem 2rem;
	}

	.copyBtn{
		margin: .5rem 0 .5rem auto;
		min-width: 0;
	}

</style>