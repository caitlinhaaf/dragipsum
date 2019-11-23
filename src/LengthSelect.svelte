<script>
    import {numSentences} from './stores.js'
</script>

<div>
    <h2>Paragraph Length</h2>
    <div class="inputContainer">
        <label>
            <input type=radio bind:group={$numSentences} value={4}>
            <span>Short</span>
        </label>

        <label>
            <input type=radio bind:group={$numSentences} value={8}>
            <span>Medium</span>
        </label>

        <label>
            <input type=radio bind:group={$numSentences} value={16}>
            <span>Long</span>
        </label>
    </div>
    
</div>

<style>
    .inputContainer{
        display: flex;
    }
    label{
        display: flex;
        /* border: 1px solid pink; */

        z-index: 2;
    }
    label > *{
        display: block;
    }

    

</style>