import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";


const aj = arcjet({

  key: process.env.ARCJET_KEY,
  rules: [
    // Shield protects your app from common attacks e.g. SQL injection
    shield({ mode: "LIVE" }),
    
    detectBot({
      mode: "LIVE", 
     
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        "CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
      ],
    }),
    slidingWindow({
        mode: 'LIVE',
            interval: '2s',
            max: 5
    })
    
  ],
});
    
export default aj;