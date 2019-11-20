<script>
	import {safeWords, nsfw} from './phrases'

	let activeIpsum = []
	let nsfwMode = false
	let numSentences = 4
	let numParagraphs = 1
	$: allPhrases = nsfwMode ?  [...safeWords, ...nsfw] : [...safeWords];

	const incrementNumParagraphs = num => () => {
		if(numParagraphs==1 && num==-1 || numParagraphs==5 && num==1) return
		numParagraphs += num
	}

	function getIpsum(){
		// let allPhrases = nsfwMode ? [...safeWords, ...nsfw] : [...safeWords]
		let ipsum = []

		let i=0
		while(i<numParagraphs){
			ipsum = [...ipsum, `${buildParagraph(allPhrases)}`]
			i++
		}
		activeIpsum = ipsum;
	}

	function buildParagraph(){
		let paragraph = ``
		let i=0;
		while(i<numSentences){
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
		<div>
			<h2>Number of Paragraphs</h2>
			<div class="numParagraphsSelect">
				<button on:click={incrementNumParagraphs(-1)}>&lt;</button>
				<p class="numParagraphs">{numParagraphs}</p>
				<button on:click={incrementNumParagraphs(1)}>&gt;</button>
			</div>
		</div>
		

		<div>
			<h2>Paragraph Length</h2>
			<label>
				<input type=radio bind:group={numSentences} value={4}>
				Short
			</label>

			<label>
				<input type=radio bind:group={numSentences} value={8}>
				Medium
			</label>

			<label>
				<input type=radio bind:group={numSentences} value={16}>
				Long
			</label>
		</div>
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
		color: #9900ff;
		font-size: 4em;
		font-weight: 100;
		margin: 0;
	}

	.numParagraphsSelect{
		display: flex;
		align-items: center;
	}
	.numParagraphsSelect button{
		border: none;
		background-color: transparent;
		font-weight: bold;
		font-size: 1.5em;
		padding: 1rem;
		margin: 0;
		cursor: pointer;
	}
	.numParagraphs{
		color: #9900ff;
		font-size: 2em;
		margin: 0 1rem;
		width: 1em;
		text-align: center
	}

	.twoCol{
		display: flex;
	}
	.twoCol > *{
		width: 50%;
	}
</style>