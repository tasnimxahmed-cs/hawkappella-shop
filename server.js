require('dotenv').config()

const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
    keyFile: '../credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
})
const spreadsheetId = "1k5qokguIc1hpOp2_7YT7H3j1C_88UTtWwwp-1GkG51Y"

const express = require('express');
const req = require('express/lib/request');
const app = express()

app.use(express.static(__dirname + '/public'))

const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)

const endpointSecret = process.env.EPS

const storeItems = new Map([
    [1, { priceInCents: 1000, name: 'Hawkappella Spring 2022 Concert'}]
])

app.post('/create-checkout-session', express.json({ type: 'application/json' }), async(req, res) => {
    try
    {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: req.body.items.map(item => {
                const storeItem = storeItems.get(item.id)
                return {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: storeItem.name
                        },
                        unit_amount: storeItem.priceInCents,
                    },
                    quantity: item.quantity
                }
            }),
            success_url: `${process.env.SERVER_URL}/success.html`,
            cancel_url: `${process.env.SERVER_URL}/`
        })
        res.json({ url: session.url })
    }
    catch (e)
    {
        res.status(500).json({ error: e.message})
    }
})

app.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
    const payload = request.body;
    const sig = request.headers['stripe-signature'];
  
    let event;
  
    try {
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
      return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        const client = await auth.getClient()

        const googleSheets = google.sheets({ version: 'v4', auth: client })

        const metaData = await googleSheets.spreadsheets.get({ auth, spreadsheetId})

        await googleSheets.spreadsheets.values.append({
            auth,
            spreadsheetId,
            range: 'Sheet1!A:C',
            valueInputOption: 'USER_ENTERED',
            resource:{
                values:[
                    [session.customer_details.name, session.customer_details.email, session.amount_subtotal/1000],
                ]
            }
        })
    }
  
    response.status(200);
});

app.listen(process.env.PORT)