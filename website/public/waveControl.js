Vue.component('waveControl', {
    props : ['id', 'target'],
    data(){
        return {
            wave : waves[this.id],
        }
    },
    computed : {
        val : function(){
            return this.wave.getVal();
        }
    },
    methods : {
        waveChanged : function(){
            let wave = {
                frequency : this.wave.frequency
            }

            this.$emit('wave-changed', this.wave.getSettings());
        }
    }
});