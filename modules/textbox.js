class TextObject{ 
    constructor(x, y){ 
        this.x = x; 
        this.y = y;
        this.lines = ['']; // default
        this.selected = false;
        this.linkedTo = [];
        this.dragPath = [];
        this.hotLink = null; // explicitly set as null as this is a number -> 0 can evaluate to false 
    }
    replaceLines(newLines){ 
        this.lines = newLines; 
    }
    getLastLine(){
        return this.lines[this.lines.length -1]; 
    }
    replaceLastLine(text){ 
        try{
            this.lines[this.lines.length -1 ] = text;    
        }catch(e){
            console.log("error in replaceLastLine func in TextObject class: ", e); 
        }
    }
    getLines(){
        return this.lines; 
    }
    appendToLines(newLine){
        this.lines.push(newLine); 
    }
    // returns the line with the max 'font' width 
    getMaxLine(ctx){
        // get the width of each line of text
        let maxLine = this.lines[0];  
        let maxWidth = 0; 
        for (const line of this.lines){
            // cannot measure in num of chars but rather the text width 
            // think about how 'iii' vs 'DDD' in certain fonts may be the same char length but the latter is wider  
            const lineWidth = this.getFontDimensions(ctx, line)[0]; 
            if (lineWidth > maxWidth){
                maxLine = line; 
                maxWidth = lineWidth; 
            }
        }
        return maxLine; 
    }
    getFontDimensions = (ctx, text) =>{
        // it is important that the ctx.textBaseline is equal to 'top' for this to work...
        // this part is important, more info here: https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics
        const metrics = ctx.measureText(text);  
        const width = metrics.width;
        const height = Math.abs(metrics.fontBoundingBoxDescent) +  Math.abs(metrics.fontBoundingBoxAscent); 
        return [width, height];  
    } 
    // returns width and height of box 
    getBoxDimensions(ctx){
        const text = this.getMaxLine(ctx);   
        const [w, lineHeight] = this.getFontDimensions(ctx, text);
        const h = lineHeight * this.lines.length;
        return [w, h]; 
    }
    inBbox(ctx, x, y){
        const [w, h] = this.getBoxDimensions(ctx);  
        return x >= this.x && x <= this.x + w && y >= this.y && y <= this.y + h;        
    }
    drawLine(ctx, lineNum, text){
        const [_, height] = this.getFontDimensions(ctx, text); 
        ctx.fillText(text , this.x, this.y + height*lineNum); 
    }
    drawLines(ctx, hotLinkOn){
        if(hotLinkOn && (this.hotLink !== null) ){ 
            ctx.fillStyle = "purple"; 
        }
        this.lines.forEach((line, idx) =>{
            this.drawLine(ctx, idx, line);
        });
        ctx.fillStyle = "#000000"; 
    }
    clearBoxRect(ctx){ 
        const text = this.getMaxLine(ctx); 
        const [w, lineHeight] = this.getFontDimensions(ctx, text);
        const pad = ctx.lineWidth; 
        ctx.clearRect(this.x, this.y, w + pad, lineHeight* (this.lines.length) + pad);    
    }
    drawBox(ctx, hotLinkOn){ // hotlinkon variable is passed in through the drawBoxMethod 
        const text = this.getMaxLine(ctx); 
        const [w, lineHeight] = this.getFontDimensions(ctx, text); 
        if (this.isSelected()){
            ctx.strokeStyle = "red"; 
        }
        if(hotLinkOn && (this.hotLink !== null) ){ 
            console.log("drawing different type colored box for hotlinkon state"); 
            ctx.strokeStyle = "purple"; 
        }
        ctx.strokeRect(this.x, this.y, w, lineHeight* this.lines.length); 
        ctx.strokeStyle = "#000000"; 
         
    }
    drawTextBox(ctx, hotLinkOn){ 
        this.clearBoxRect(ctx);
        this.drawLines(ctx, hotLinkOn); 
        this.drawBox(ctx, hotLinkOn);  
    }
    isSelected(){
        return this.selected === true;   
    }
    toggleSelected(){
        this.selected = !this.selected; 
    }
    removeLinked(line){
        this.linkedTo = this.linkedTo.filter(curLine => curLine !== line); 
    }
    addLinked(line){
        this.linkedTo.push(line); 
    }
    getLinked(){
        return this.linkedTo; 
    }
}

// export this code 
export {TextObject};  