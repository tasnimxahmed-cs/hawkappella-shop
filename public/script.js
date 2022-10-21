
function quan(inc)
{
    num = document.getElementById("qty")
    newNum = eval(num.innerHTML) + parseInt(inc)
    if(newNum <1) newNum=1
    num.innerHTML = newNum
}

const button = document.getElementById('ticket')
button.addEventListener("click", () => {
    const q = parseInt(document.getElementById("qty").innerHTML)
    fetch("/create-checkout-session", {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(
            {
                items: [
                    { id: 1, quantity: q}
                ]
            }
        )
    }).then(res => {
        if(res.ok) return res.json()
        return res.json().then(json => Promise.reject(json))
    }).then(({ url }) => {
        window.location = url
    }).catch(e => {
        console.error(e.error)
    })
})