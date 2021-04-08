// ==UserScript==
// @name         Panopto Video Downloader
// @namespace    http://github.com/jaytohe/
// @version      1.2.2
// @description  Adds a download button to Panopto videos.
// @author       jaytohe
// @require      https://cdn.jsdelivr.net/npm/axios@0.21.1/dist/axios.min.js
// @match        https://*.panopto.eu/Panopto/Pages/Viewer.aspx?id=*
// @match        https://*.panopto.eu/Panopto/Pages/Sessions/List.aspx
// @grant        GM_addStyle
// ==/UserScript==

//Global Vars

//Coordinates for download, progress bar elements.
const dl_container_pos = {left: 5, bottom: 20};
const downopto_bar_container_pos = {bottom: 60};
const downopto_bar_pos = {width: 97};

function downloadVideo(url, savename, mimetype) {
    console.log(`Init video dl : ${url}`);
    setProgressBarVisibility(true);
    return axios.get(url, {
        responseType: 'blob',
        onDownloadProgress: function(progressEvent) {
          const percentage = Math.round(progressEvent.loaded / progressEvent.total * 100);
          setProgressBarValue(percentage);
          setProgressText(`Fetching: ${percentage}%`,'downopto-bar');
        }
    })
    .then(function(response) {
        const blob = response.data;
        const blob_url = URL.createObjectURL(blob, {
          type: mimetype
        });

        //Create hidden anchor and click it to download blob vid.
        const tmp = document.createElement('a');
        tmp.href = blob_url;
        tmp.download = sanitize(savename,'_') || ''; //set the filename.
        document.body.appendChild(tmp);
        tmp.click();
        tmp.remove();
        return Promise.resolve();
    })
    .catch(function(error) {
        return Promise.reject(new Error(`DL failed with msg : ${error.message}`));
    });
}

function constructDownloadURL(video_id) {
    let url = window.location.href;
    url = url.substr(0, url.indexOf('panopto.eu')+10);

    return url + `/Panopto/Podcast/Social/${video_id}.mp4?mediaTargetType=videoPodcast`;
}

function LecturesListHandler() { //handles scriptMode =1

  //Fix coordinates of download button and progress bar.
  dl_container_pos.left = 17;
  dl_container_pos.bottom = 40;
  downopto_bar_container_pos.bottom = 110;
  downopto_bar_pos.width = 125;

  //Register event listener of dl button.
  createDownloadButton("Download All").addEventListener("click", function() {
      onLecturesListBtnClick();
  }, false);

  //Create the two progress bars.
  // One for the individual video download progress.
  // Second for how many videos have been downloaded so far.
  createDownloadProgressBar();
  createDownloadProgressBar('downopto-batch-bar');
}
function onLecturesListBtnClick() { //handles the dl btn click when scriptMode = 1.
    console.log("called lecturesList");
    const LecturesList = document.querySelectorAll("table[id^=detailsTable] tr[draggable='false']"); //get tr rows of all visible videos.
    const videoIDS = []; //holds the id and the name for each video in LecturesList.
    for (const row of LecturesList) {
        const filename = row.querySelector("span[class='detail-title']").innerText; //extract the video's name from the row.
        videoIDS.push({"id": row.id, "name": filename});
    }
    let videos_dled = 0; //keep track of how many vids have been downloaded.
    videoIDS.reduce(function(previousVideoPromise, video) { //sequentially service promises.
        const source = constructDownloadURL(video.id);
        const batch_progress_bar = document.getElementById("downopto-batch-bar");
        return previousVideoPromise
               .catch(function(err) {
                 console.log(err.message); //log dl error in case of Promise.reject
                 videos_dled = (videos_dled < 0) ? 0 : videos_dled - 1; //if error in download, decrement videos_dled.
               })
               .then(function() {
                 return downloadVideo(source, video.name, 'video/mp4').then(function() { //mimetype hardcoded to make my life easier.
                   //After successful download:
                   videos_dled += 1;
                   batch_progress_bar.setAttribute(
                     'value',
                     Math.round(videos_dled / videoIDS.length * 100) //Update second "videos downloaded thus far" progress bar.
                   );
                   setProgressText(`${videos_dled} out of ${videoIDS.length}`,'downopto-batch-bar');
                 })
               });

    }, Promise.resolve()); //initial accumulator value to set Promise type.
}

function ViewerPageHandler() { //handles scriptMode = 0
  const link = document.querySelector("meta[name^='twitter:player:stream']").content; //get video url
  const name = document.querySelector("meta[property^='og:title']").content; //get video's name
  const mimetype = document.querySelector("meta[property^='og:video:type']").content; //get video's mimetype
  const button = createDownloadButton("Download");
  createDownloadProgressBar();
  button.addEventListener("click", function() {
      downloadVideo(link, name, mimetype);
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
        return 0; // 0 indicates signle video download mode (Viewer.aspx page)
    }
    else if (folderURL.test(url)) { // 1 indicates Bulk Download Mode (List.aspx page)
        return 1;
    }
    return -1;

}


//MAIN FUNCTION.
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


//HTML, CSS functions
function createDownloadButton(btn_txt) {
  const btnNode = document.createElement('div');
  const dl_btn = document.createElement('button');
  btnNode.setAttribute('id', 'pdl-container');
  dl_btn.id = 'pdl-btn';
  dl_btn.innerHTML = btn_txt;
  btnNode.appendChild(dl_btn);
  document.body.appendChild(btnNode);
  return dl_btn;
}

function createDownloadProgressBar(bar_id = 'downopto-bar') {
  const container = document.createElement("div");
  const bar = document.createElement("progress");
  container.setAttribute('id', `${bar_id}-container`);
  bar.setAttribute("max", "100");
  bar.setAttribute("id", bar_id);
  container.appendChild(bar);
  document.body.appendChild(container);
  createPercentageText(bar_id);
  setProgressBarVisibility(true, bar_id);
  setProgressBarValue(0, bar_id);
}

function createPercentageText(bar_id = 'downopto-bar') {
  const container = document.createElement("div");
  container.setAttribute('id', `${bar_id}-percentage-container`);
  const s = document.createElement("span");
  s.setAttribute("id", `${bar_id}-percentage`);
  s.innerHTML = "";
  container.appendChild(s);
  document.body.appendChild(container);
}

function setProgressBarVisibility(k, bar_id = 'downopto-bar') {
  const t = k ? 'block' : 'none';
  document.getElementById(bar_id).style.display = t;
}

function setProgressBarValue(val, bar_id = 'downopto-bar') {
  document.getElementById(bar_id).setAttribute('value', val);
}

function setProgressText(val, bar_id) {
  document.getElementById(bar_id+'-percentage').innerHTML = val;
}


//UTILITY FUNCTIONS.

//Adapted from https://github.com/parshap/node-sanitize-filename/blob/master/index.js
function sanitize(input, replacement='') {
const illegalRe = /[\/\?<>\\:\*\|"]/g;
const controlRe = /[\x00-\x1f\x80-\x9f]/g;
const reservedRe = /\.+/;
const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
const windowsTrailingRe = /[\. ]+$/;
  if (typeof input !== 'string') {
    throw new Error('Input must be string');
  }
  const sanitized = input
    .replace(illegalRe, replacement)
    .replace(controlRe, replacement)
    .replace(reservedRe, replacement)
    .replace(windowsReservedRe, replacement)
    .replace(windowsTrailingRe, replacement);
  return sanitized;
}



GM_addStyle(`
    #pdl-container {
        position: absolute;
        bottom: ${dl_container_pos.bottom}px;
        left: ${dl_container_pos.left}px;
        opacity: 0.8;
        z-index: 1100;
    }

    #downopto-bar-container {
      position: absolute;
      bottom: ${downopto_bar_container_pos.bottom}px;
      left: ${dl_container_pos.left}px;
      opacity: 0.8;
      z-index: 1100;
    }

    #downopto-bar-percentage-container {
      position: absolute;
      bottom: ${downopto_bar_container_pos.bottom}px;
      left: ${dl_container_pos.left}px;
      opacity: 0.8;
      z-index: 1100;
    }

    #downopto-batch-bar-percentage-container {
      position: absolute;
      bottom: 90px;
      left: 17px;
      opacity: 0.8;
      z-index: 1100;
    }

    #downopto-batch-bar-container {
      position: absolute;
      bottom: 90px;
      left: 17px;
      opacity: 0.8;
      z-index: 1100;
    }

    #pdl-btn {
        cursor: pointer;
        border: none;
        background: #008080;
        font-size:  20px;
        color:  white;
        padding: 5px 5px;
        text-align: center;
    }

    #downopto-bar {
      height: 20px;
      width: ${downopto_bar_pos.width}px;
    }

    #downopto-batch-bar {
      height: 12px;
      width: 125px;
    }

`);
