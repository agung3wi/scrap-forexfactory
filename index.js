const { Builder, By, Key, until } = require('selenium-webdriver');
const webdriver = require('selenium-webdriver');
const moment = require("moment")
const fs = require('fs')

const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const HTMLParser = require('node-html-parser');


var o = new chrome.Options();


function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let scrapToday = function () { 
    return new Promise(async (resolve, reject) => {
        console.log("req")
        let driver = new webdriver.Builder()
        .forBrowser('chrome')
        // .withCapabilities(webdriver.Capabilities.chrome())
        .setChromeOptions(o)
        .usingServer('http://192.168.88.40:4444/wd/hub')
        .build();
    
        try {
        
            await driver.get('https://www.forexfactory.com/calendar?day=today');
            await driver.wait(until.elementLocated(By.xpath("//tr[contains(@class, 'calendar__row calendar_row')]")), 5000);

            let time = []
            let elements = await driver.findElements(By.xpath("//tr[contains(@class, 'calendar__row calendar_row')]"))
            let currentTime = "",
            currentCurr = "",
            previous = "",
            forecast = "",
            actual = "",
            impact = ""
            
            let result = []
            for (let e of elements) {
                let html = await e.getAttribute('innerHTML')
                impact = HTMLParser.parse(html).querySelector(".calendar__impact-icon").querySelector("span").classNames.trim()

                const text = (await e.getText()).split("\n")
                if (text.length < 3) continue
                if (text.length > 3) {
                    text.splice(0, 2)
                }

                const split1 = text[0].trim().split(" ")
                if (split1.length > 1) {
                    currentTime = split1[0]
                    currentCurr = split1[1]
                } else {
                    currentCurr = split1[0]
                }

                if (text[2] !== undefined) {
                    const value = text[2].split(" ")
                    if (value.length == 3) {
                        previous = value[2]
                        forecast = value[1]
                        actual = value[0]
                    } else if (value.length == 2) {
                        previous = value[1]
                        forecast = value[0]
                        actual = ""
                    } else {
                        previous = value[0]
                        forecast = ""
                        actual = ""
                    }
                } else {
                    previous = ""
                    forecast = ""
                    actual = ""
                }

                result.push({
                    time: currentTime,
                    currency: currentCurr,
                    impact: impact,
                    news: text[1],
                    actual: actual,
                    forecast: forecast,
                    previous: previous
                })
                time.push(text)

            }
            filepath = "./data/" + moment().format("YYYY-MM-DD") + ".json"
            filepathToday = "./data/today.json"
            fs.writeFileSync(filepath, JSON.stringify(result));
            fs.writeFileSync(filepathToday, JSON.stringify(result));

            console.log("Finish scrap", result)


        } catch(err) {
            await driver.quit();
            reject({success: false})
        } finally {
            await driver.quit();
            resolve({success:true})
        } 
    });
}


const express = require('express')
const app = express()
const port = 5300

app.use(express.static('data'))

app.get('/', (req, res) => {
    const todayFile = './data/today.json';
    const fs = require('fs');
    
    const content = JSON.parse(fs.readFileSync(todayFile, 'utf8'))
    res.json(content)
})

app.get('/scrap', async (req, res) => {
    let status = await scrapToday();
    status.time = new Date().getTime()
    res.json(status)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})