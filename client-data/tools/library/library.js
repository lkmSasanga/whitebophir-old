const xlinkNS = "http://www.w3.org/1999/xlink";
const templateTool = document.querySelector('.template-tool');
const templateInner = document.querySelector('#library-block');
const subjectsList = document.querySelector('.list-items');
const activeSubjects = [...subjectsList.getElementsByClassName('active')];
const subjectFigures = [...document.getElementsByClassName('template-figure')];

let modal = null;

var openTemplatesModal = () => {
    templateInner.style.display = 'block';
    modal = picoModal({
        content: templateInner,
		closeHtml: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L6 6M6 6L11 1M6 6L1 11M6 6L11 11" stroke="#828282" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        closeClass: 'close-library',
        modalClass: 'library-inner',
        overlayStyles: {
            backgroundColor: 'none'
        }
    }).show();

    ym(68060329, 'reachGoal', 'templates');
}

let handleInstertImage = (elem) => {
    let image = new Image();
    image.src = `/tools/library/images/${elem.id}.svg`;

    image.onload = function () {
        let uid = Tools.generateUID('t');
        let ctx, size, dataURL;
        let scale = 1;
        do {
            ctx = document.createElement('canvas').getContext('2d');
            ctx.canvas.width = image.width * scale;
            ctx.canvas.height = image.height * scale;
            ctx.drawImage(image, 0, 0, image.width * scale, image.height * scale);
            dataURL = ctx.canvas.toDataURL('image/png', 0.8);

            size = dataURL.length;

            scale = scale * Math.sqrt(Math.min(
                0.9,
                Tools.server_config.MAX_DOCUMENT_SIZE / size
            ));
        } while (size > Tools.server_config.MAX_DOCUMENT_SIZE);

        let width = this.width * scale;
        let height = this.height * scale;
        const aspect = width / height;

        if (height > document.documentElement.clientHeight / 2 / Tools.scale) {
            height = document.documentElement.clientHeight / 2 / Tools.scale;
            width = height * aspect;
        }
        if (width > document.documentElement.clientWidth / 2 / Tools.scale) {
            width = document.documentElement.clientWidth / 2 / Tools.scale;
            height = width / aspect;
        }

        const offsetHeight = document.documentElement.scrollLeft === 0 ? -Tools.svg.getBoundingClientRect().left : document.documentElement.scrollLeft;

        let msg = {
            id: uid,
            type: 'template',
            data: dataURL,
            size: size,
            w: width,
            h: height,
            x: ((offsetHeight + document.documentElement.clientWidth / 2) / Tools.scale) - width / 2,
            y: ((document.documentElement.scrollTop + document.documentElement.clientHeight / 2) / Tools.scale) - height / 2,
            select: true,
        };

        modal.close();

        draw(msg);
        msg.select = false;
        Tools.send(msg, 'Template');
        Tools.addActionToHistory({ type: 'delete', id: uid });
    }
}

function draw(msg) {
    let img = Tools.createSVGElement('image');
    img.id = msg.id;
    img.setAttributeNS(xlinkNS, 'href', msg.data);
    img.x.baseVal.value = msg['x'];
    img.y.baseVal.value = msg['y'];
    img.setAttribute('width', msg.w);
    img.setAttribute('height', msg.h);
    img.setAttribute('class', 'board-image');

    if (img.transform) {
	    img.style.transform = msg.transform;
	    img.style.transformOrigin = msg.transformOrigin;
    }

    Tools.drawingArea.appendChild(img);

    if (msg.select) {
        Tools.change('Transform', 1);
        Tools.list.Transform.selectElement(img);
    }
}

Tools.add({
    'name': 'Template',
    'draw': draw
});

templateTool.addEventListener('click', openTemplatesModal);

activeSubjects.forEach((elem) => {
    const sublist = elem.querySelector('.subject-list');
    const closeBtn = elem.querySelector('.close-button');

    elem.addEventListener('click', () => {
        if (sublist) {
            sublist.style.display = sublist.style.display === 'none' ? 'block' : 'none';
        }
        closeBtn.style.transform = closeBtn.style.transform === 'rotate(180deg)' ? 'rotate(0)' : 'rotate(180deg)';
    });
});

subjectFigures.forEach((elem) => {
    elem.addEventListener('click', () => { handleInstertImage(elem) });
});