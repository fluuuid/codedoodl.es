#!/bin/bash 
#
# Doodle thumbnail generation
#
# Requirements / assumptions:
# - ffmpeg with libvorbis, h264
# - imageOptim cli
# - input source is .mov captured on MBP using quicktime screen capture,
# with full-size browser window (this affects the cropping script)
#
# Usage:
# -> create .mov screen recording and save in to doodle dir
# $ cd doodles/doodleauthor/doodlename
# $ ../../../utils/thumbs.sh <source_filename> <start_time>
#
# eg $ ../../../utils/thumbs.sh source 00:00:02.00 # use "source.mov" from 2s onwards
#

function trim {
	ffmpeg -i "$1.mov" -ss $2 -t 00:00:06.0 "$1-trim.mov"
}

function crop {
	ffmpeg -i "$1-trim.mov" -vf "crop=1600:1600:640:190" "$1-crop.mov"
}

function reformat {
	ffmpeg -i "$1-crop.mov" -vf scale=500:500 -c:v libvpx -b:v 1M -c:a libvorbis thumb.webm
	ffmpeg -i "$1-crop.mov" -vf scale=500:500 -vcodec h264 -acodec aac -strict -2 thumb.mp4
}

function images {
	ffmpeg -i "$1-crop.mov" -f image2 -ss 00.00 -s 500x500 -vframes 1 video-cover.jpg
	ffmpeg -i "$1-crop.mov" -f image2 -ss 03.00 -s 500x500 -vframes 1 thumb.jpg
}

function gif {
	ffmpeg -ss 00:00:00.000 -i "$1-crop.mov" -pix_fmt rgb24 -vf scale=506:-1 -r 10 "thumb.gif"
}

function optimiseImages {
	imageOptim -d .
}

function thumbs {
	trim $1 $2
	crop $1
	reformat $1
	images $1
	gif $1
	optimiseImages

	rm "$1-trim.mov"
	rm "$1-crop.mov"
}

thumbs $1 $2
