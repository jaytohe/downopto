# downopto

Greasyfork Link : https://greasyfork.org/en/scripts/424643-downopto-panopto-video-downloader

Adds a download button to Re:View Panopto to allow one to download lectures. 

Based on [Panopto-DL](https://greasyfork.org/en/scripts/416679-panopto-dl). 

## Improvements over Panopto-DL:
- Preserves the original uploaded filename.
- Does not open a new tab. Downloads the video while staying in same page.
- Bulk Download Functionality. Allows you to download all videos from a folder (List.aspx links)

## TODO
- ~~Bulk Download Functionality.~~ Done. However, it is sequential.*
- ~~Add ability to bulk download 2 or more videos concurrently for faster download.~~ Scrapped cus CSS gets nasty with more than 2 progress bars and I can't be arsed.
- ~~Fix terrible CSS. Hate dealing with CSS.~~
- Add "Cancel Download" button.

\*At first, it downloaded __everything__ in parallel. That is a network hog so switched to sequential approach.
Best solution is 2nd TODO point.
