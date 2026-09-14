const characters = require('../../utils/characters');

// Stacks one image per character layer; moving layers loop with the generated motion classes.
Component({
  properties: {
    catalogId: { type: String, value: '' },
    size: { type: Number, value: 124 }
  },
  data: { layers: [] },
  observers: {
    catalogId(id) {
      const layers = (characters.exercise[id] || []).map(layer => ({ src: layer.src, motion: layer.motion || '' }));
      this.setData({ layers });
    }
  }
});
