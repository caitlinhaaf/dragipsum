<script>
    import {numSentences} from './stores.js'
</script>

<div>
    <h2>Paragraph Length</h2>
    <div class="inputContainer">
        <label>
            <input type=radio tabindex="0" bind:group={$numSentences} value={4}>
            <span>Short</span>
        </label>

        <label>
            <input type=radio tabindex="0" bind:group={$numSentences} value={8}>
            <span>Medium</span>
        </label>

        <label>
            <input type=radio tabindex="0" bind:group={$numSentences} value={16}>
            <span>Long</span>
        </label>
    </div>
    
</div>

<style>
    .inputContainer{
        display: flex;
    }
    input{
        position: absolute;
        opacity: 0;
    }
    span{
        padding: .5rem 0;
    }
    input:focus+span{
        color: #f9557b;
        border-bottom: 1px solid #f9557b;
    }
    input:checked+span{
        color: #bb32a1;
    }
    label{
        cursor: pointer;
        z-index: 2;
        padding: 1rem 2rem;
    }
</style>