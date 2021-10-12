const getCursorPosition = (canvas, event) => {
    const rect = canvas.getBoundingClientRect(); 
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    console.log("x: " + x + " y: " + y); 
}


window.onload = () =>{
    const canvas = document.getElementById("mimi-canvas");
    const ctx = canvas.getContext("2d");
    // ctx.strokeRect(0,0,300,200);
    
    canvas.addEventListener("click", (event)=>{ 
        getCursorPosition(canvas, event); 
    }); 

}
