// ==UserScript==
// @name         Panopto Video Downloader
// @namespace    http://github.com/jaytohe/
// @version      1.1
// @description  Adds a download button to Panopto videos.
// @author       jaytohe
// @match        https://*.panopto.eu/Panopto/Pages/Viewer.aspx?id=*
// @match        https://*.panopto.eu/Panopto/Pages/Sessions/List.aspx
// @grant        GM_addStyle
// ==/UserScript==

function downloadVideo(url, savename, mimetype) {
    console.log(`Init video dl : ${url}`);
    fetch(url, {
        headers: new Headers({
            'Origin': location.origin
        }),
        mode: 'cors'
    }).then(function(response) {
        if (!response.ok) {
            return Promise.reject(new Error("Failed to dl "+url));
        }
        return response.blob();
    }).then(function(blob) {
        const blob_url = URL.createObjectURL(blob, {
            type: mimetype
        });

        //Create hidden anchor and click it to download blob vid.
        const tmp = document.createElement('a');
        tmp.href = blob_url;
        tmp.download = savename || ''; //set the filename.
        document.body.appendChild(tmp);
        tmp.click();
        tmp.remove();
        return Promise.resolve();
    });
}


function ViewerPageHandler() {
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
}

function constructDownloadURL(video_id) {
    //TODO: Fix Code URL Repeat
    let url = window.location.href;
    url = url.substr(0, url.indexOf('panopto.eu')+10);

    return url + `/Panopto/Podcast/Social/${video_id}.mp4?mediaTargetType=videoPodcast`;
}

function onLecturesListBtnClick() {
    console.log("called lecturesList");
    /*
    *"https://uniofbath.cloud.panopto.eu/Panopto/Podcast/Social/e4…7c6a-40f0-b239-acf600ce3273.mp4?mediaTargetType=videoPodcast"
    *
    */
    const LecturesList = document.querySelectorAll("table[id^=detailsTable] tr[draggable='false']");
    //console.log(LecturesList);
    const videoIDS = [];
    for (const row of LecturesList) {
        const filename = row.querySelector("span[class='detail-title']").innerText;
        videoIDS.push({"id": row.id, "name": filename});
    }
    /*
    console.log(videoIDS);

    for (let obj of videoIDS) {
        console.log(constructDownloadURL(obj.id));
    }
    return;
    */
    videoIDS.reduce(function(previousVideoPromise, video) {
        const source = constructDownloadURL(video.id);
        return previousVideoPromise
               .catch(function(err) {console.log(err.message);})
               .then(function() {
            return downloadVideo(source, video.name, 'video/mp4');
        });
    }, Promise.resolve());
}

function LecturesListHandler() {
    const btnNode = document.createElement('div');
    btnNode.setAttribute('id', 'pdl-container');
    const dl_btn = document.createElement('button');
    dl_btn.id = 'pdl-btn';
    dl_btn.innerHTML = "Download All";
    btnNode.appendChild(dl_btn);
    document.body.appendChild(btnNode);
    dl_btn.addEventListener("click", function() {
      onLecturesListBtnClick();
  }, false);

}

function scriptMode() { //re-checks if we are on single lecture page or not.
    //Unfortunately, there's no way to find which specific match pattern called the script.
    //So we need to re-check.
    const folderURL = /^https:\/\/(\w+\.)+panopto\.eu\/Panopto\/Pages\/Sessions\/List\.aspx$/;
    const lecURL = /^https:\/\/(\w+\.)+panopto\.eu\/Panopto\/Pages\/Viewer\.aspx\?id=.+$/;
    let url = window.location.href;
    url = url.substr(0, url.indexOf('#')) || url;
    if (lecURL.test(url)) {
        return 0;
    }
    else if (folderURL.test(url)) {
        return 1;
    }
    return -1;

}

(function () {
    switch(scriptMode()) {
        case 0:
            ViewerPageHandler();
            break;
        case 1:
            LecturesListHandler();
            break;
        default:
            return;
    }

})();

GM_addStyle(`
    #pdl-container {
        position:               absolute;
        bottom:                 50px;
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