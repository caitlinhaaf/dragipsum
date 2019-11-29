<script>
    import {nsfwMode} from './stores.js'
</script>

<label>
    <input type=checkbox bind:checked={$nsfwMode}>
    <span>Add some Charisma, Uniqueness, Nerve, and Talent (NSFW)</span>
</label>

<style>
    label{
        display: block;
        margin: 0 auto;
        padding: 1rem;
        cursor: pointer;
    }
    input{
        position: absolute;
        opacity: 0;
    }
    span{
        display: flex;
    }
    span::before{
        content: '';
        display: block;
        width: 1rem;
        height: 1rem;
        background-color: white;
        border: 1px solid pink;
        border-radius: .25rem;
        margin-right: 1rem;
        transition: all .3s ease-in-out;
    }
    input:focus + span{
        color: pink;
    }
    input:focus + span:before{
        background-color: pink;
    }
    input:checked + span:before{
        background-color: purple;
    }
    

</style>