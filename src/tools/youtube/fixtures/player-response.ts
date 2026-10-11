export const PLAYER_RESPONSE = Object.freeze({
  videoDetails: {
    videoId: "abc123XYZ00",
    title: "Tuto Rust : ownership",
    author: "Chaine Test",
    lengthSeconds: "212",
    shortDescription: "Dans cette video on voit le borrow checker.\n00:00 Intro\n01:02 Ownership",
  },
  playerOverlays: {
    playerOverlayRenderer: {
      decoratedPlayerBarRenderer: {
        decoratedPlayerBarRenderer: {
          playerBar: {
            multiMarkersPlayerBarRenderer: {
              markersMap: [
                {
                  key: "DESCRIPTION_CHAPTERS",
                  value: {
                    chapters: [
                      { chapterRenderer: { title: { simpleText: "Ownership" }, timeRangeStartMillis: 62000 } },
                      { chapterRenderer: { title: { simpleText: "Intro" }, timeRangeStartMillis: 0 } },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        { baseUrl: "https://www.youtube.com/api/timedtext?v=abc123XYZ00&lang=en", languageCode: "en", kind: "asr" },
        { baseUrl: "https://www.youtube.com/api/timedtext?v=abc123XYZ00&lang=fr", languageCode: "fr" },
      ],
    },
  },
});
