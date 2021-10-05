const toolLibrary = document.getElementById('Tool-Library');
const library = document.getElementById('library-block');
const closeWindow = document.querySelector('.close-library');
const wb = document.getElementById('wb');
const geometry = document.querySelector('#solid-geometry');
const geometryItems = document.querySelector('.list-items > ul');

geometry.addEventListener('click',function (){
    if (geometryItems.style.display === 'none') {
        geometryItems.style.display = 'block'
    } else {
        geometryItems.style.display = 'none'
    }
})
closeWindow.addEventListener('click', closeModal );
toolLibrary.addEventListener('click', openModal);

window.onclick = function (e) {
  if (e.target === wb) {
      closeModal ()
    }
}

document.addEventListener('keydown', function (e){
    if (e.keyCode === 83) {
        openModal()
    }
})

function openModal() {
    library.style.display = "block";
}

function closeModal () {
    library.style.display = "none";
}



