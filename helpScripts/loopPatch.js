var unirest = require("unirest")
var token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6InRyYW5zc2ZlcmFAY2FyZ29ydW4ucnUiLCJzdWIiOiIxMjQ4ODY0MiIsImp0aSI6ImVkOWMzMTcwLTcwMmQtNDkzYi1iNWQyLTJlYzQwZDU2OTYxMCIsIm9yZ2FuaXphdGlvbklkIjoiMTA4OTcxNzg1IiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjoi0JDQtNC80LjQvdC40YHRgtGA0LDRgtC-0YAg0YLRgNCw0L3RgdC_0L7RgNGC0L3QvtC5INC60L7QvNC_0LDQvdC40LgiLCJleHAiOjE3NjgzMDE4OTEsImlzcyI6Imh0dHBzOi8vYXBwLmNhcmdvcnVuLnJ1LyIsImF1ZCI6Imh0dHBzOi8vYXBwLmNhcmdvcnVuLnJ1LyJ9.Hy9b-pBGoxw3R56pIGIgzAIq9tPMt1829S4aU9CZvcI'
function getBids() {
    return unirest('GET', `https://app.cargorun.ru/api/bids/getlist?$filter=isDeleted eq false and firstBidPoint/planEnterDateOffset ge 2025-12-31T20:00:00.000Z&$orderby=id asc`)
        .headers({
            'Authorization': `Bearer ${token}`
        })
        .then(function (res) {
            var BidList = JSON.parse(res.raw_body); // список заявок
            // console.log(res.status)
            return BidList
        })
        .catch(error => {
            console.log(error)
            // return browser.assert.fail(error);
        })
}
function sendReq(bidList, index) {
    if (bidList[index]) {
        console.log(index)
        Patch(bidList[index].id)
        setTimeout(() => {
            sendReq(bidList, index + 1)
        }, 200)
    }
}
function Patch(id) {
    return unirest('POST', `https://app.cargorun.ru/api/truckingbids/patch`)
        .headers({
            'Authorization': `Bearer ${token}`,
            'Content-Type': ['application/json']
        })
        .send(JSON.stringify({
            "id": id,
            "ndsTypeId": 129493473
        }))
        .then(function (res) {
            console.log(res.status, res.raw_body)
            if (res.status != 200) {
                console.log(`ошибка по заявке ${id}`)
            }
        }) //запрос на отмену заявки
        .catch(error => {
            // return browser.assert.fail(error);
        })
}

getBids().then((x) => {
    sendReq(x, 0)
})
