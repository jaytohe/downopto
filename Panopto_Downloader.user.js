// ==UserScript==
// @name         Panopto Video Downloader
// @namespace    http://github.com/jaytohe/
// @version      1.0
// @description  Adds a download button to Panopto videos.
// @author       jaytohe
// @match        https://*.panopto.eu/Panopto/Pages/Viewer.aspx?id=*
// @grant        GM_addStyle
// ==/UserScript==

async function downloadVideo(url, savename, mimetype) {
    const response = await fetch(url, {
        headers: new Headers({
            'Origin': location.origin
        }),
        mode: 'cors'
    });

    // get reader superclass obj
    const reader = response.body.getReader();
    
    //get length of the video.
    const contentLength = +response.headers.get('Content-Length');

    const progress = document.getElementById("dl_progress");

    let receivedLength = 0; // number of raw bytes received.
    let chunks = []; // array of received binary chunks (comprises the body).

    // infinite loop while the body is downloading
    while (true) {
        // done is true for the last chunk
        // value is Uint8Array of the chunk bytes
        const {
            done,
            value
        } = await reader.read();

        if (done) {
            progress.innerHTML = '';
            break;
        }
        chunks.push(value); //push raw byte to chunks.
        receivedLength += value.length;
        let percentage = Math.round(receivedLength / contentLength * 100);
        progress.innerHTML = `Downloading : ${percentage}%`; //show dl percent to user.
    }

    // Concatenate chunks into single Uint8Array.
    let chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for (let chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
    }

    const blob_url = URL.createObjectURL(new Blob([chunksAll.buffer], {
        type: mimetype
    })); //instantiate a blob from the chunksAll raw bytes array.

    //Create hidden anchor and click it to download blob vid.
    const tmp = document.createElement('a');
    tmp.href = blob_url;
    tmp.download = savename || ''; //set the filename.
    document.body.appendChild(tmp);
    tmp.click();
    tmp.remove();
}

(function () {
  const link = document.querySelector("meta[name^='twitter:player:stream']").content;
  const name = document.querySelector("meta[property^='og:title']").content;
  const mimetype = document.querySelector("meta[property^='og:video:type']").content;
  const btnNode = document.createElement('div');
  btnNode.setAttribute('id', 'pdl-container');

  //DL Button
  const dl_btn = document.createElement('button');
  dl_btn.id = 'pdl-btn';
  dl_btn.innerHTML = "Download";

  //DL Progress report.
  const bar = document.createElement('p');
  bar.id = "dl_progress";
  dl_btn.addEventListener("click", function() {
      downloadVideo(link, name, mimetype);
  }, false);
  
  btnNode.appendChild(bar);
  btnNode.appendChild(dl_btn);
  document.body.appendChild(btnNode);
})();

GM_addStyle(`
    #pdl-container {
        position:               absolute;
        bottom:                 5px;
        left:                   5px;
        opacity:                0.8;
        z-index:                1100;
    }
    #pdl-btn {
        cursor:                 pointer;
        border:                 none;
        background:             #008080;
        font-size:              20px;
        color:                  white;
        padding:                5px 5px;
        text-align:             center;
    }
`);