const getCursorPosition = (canvas, event) => {
    const rect = canvas.getBoundingClientRect(); 
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return [x, y]; 
}
const clearInput = (inputEl) =>{
    inputEl.value = ""; 
}

window.onload = () =>{
    const userInput = document.querySelector("input"); 
    const canvas = document.getElementById("mimi-canvas");
    const ctx = canvas.getContext("2d");
    // configurations 
    ctx.font = "15pt Comic Sans MS";  
    // global variables 
    let clickX, clickY;  
    
    // event handlers
    window.addEventListener("keydown" , (event) =>{
        console.log(event.key); 
        if (event.key === "Enter"){
            console.log("here");
            // SHOVE THIS REUSED CODE INTO A FUNCTION ALSO ON LINE 47 
            const metrics = ctx.measureText(userInput.value);
            const width = metrics.width;
            // thank you to https://erikonarheim.com/posts/canvas-text-metrics/ for this 
            const height = Math.abs(metrics.fontBoundingBoxAscent) + Math.abs(metrics.fontBoundingBoxDescent);
            clickY += height; // append to new line 
        }
    }); 
    canvas.addEventListener("click", (event)=>{
        const [x,y] = getCursorPosition(canvas, event);
        [clickX, clickY] = [x, y];

        if (userInput.value.length > 0){
            clearInput(userInput);
        }
        userInput.focus();  
    });

    userInput.addEventListener("input", ()=>{
        
        const metrics = ctx.measureText(userInput.value); 
        const width = metrics.width;
        // thank you to https://erikonarheim.com/posts/canvas-text-metrics/ for this 
        const height = Math.abs(metrics.fontBoundingBoxAscent) + Math.abs(metrics.fontBoundingBoxDescent);
        // clear previous rect 
        ctx.clearRect(clickX, clickY + 10, width, -height);   
        // fill new rect and text 
        ctx.fillText(userInput.value, clickX, clickY); 
        ctx.strokeRect(clickX, clickY + 10, width, -height);    
    }); 

}
