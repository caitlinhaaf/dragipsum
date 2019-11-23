<script>
    import {numParagraphs} from './stores.js'
</script>

<div>
    <h2>Number of Paragraphs</h2>
    <div class="numParagraphsSelect">
        <button on:click={numParagraphs.decrement}>&lt;</button>
        <p class="numParagraphs">{$numParagraphs}</p>
        <button on:click={numParagraphs.increment}>&gt;</button>
    </div>
</div>

<style>
    .numParagraphsSelect{
            display: flex;
            align-items: center;
    }
    .numParagraphsSelect button{
        color: white;
        border: none;
        background-color: transparent;
        font-weight: bold;
        font-size: 1.5em;
        padding: 1rem;
        margin: 0;
        cursor: pointer;
    }
    .numParagraphs{
        font-size: 2em;
        margin: 0 1rem;
        width: 1em;
        text-align: center
    }
</style>