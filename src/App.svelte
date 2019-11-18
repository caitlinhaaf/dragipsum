<script>
	import {safeWords, nsfw} from './phrases'

	let activeIpsum = ''
	let nsfwMode = false // TODO: set with form inputs
	let numSentences = 4 // TODO: set with form inputs

	function getIpsum(){
		//if using nsfw mode, combine phrase arrs
		let allPhrases = nsfwMode ? [...safeWords, ...nsfw] : [...safeWords]
		// 
		let ipsum = ``
		let i=0;
		while(i<numSentences){
			ipsum += `${buildSentence(allPhrases)}`
			i++;
		}
		activeIpsum = ipsum;
	}

	function buildSentence(phrasesArr){
		let i=0;
		let sentence = ``;
		while(i<5){
			const phrase = phrasesArr[Math.floor(phrasesArr.length*Math.random())]
			sentence += `${i===0 ? ` ${phrase.charAt(0).toUpperCase()}` + phrase.substring(1) : phrase }${i===4 ? `.`  : ` `}`
			i++
		}
		return sentence;
	}
</script>

<main>
	<h1>Drag Race Ipsum</h1>

	<p>
		{activeIpsum}
	</p>

	<button on:click={getIpsum}>	
		Make Ipsum
	</button>

</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>