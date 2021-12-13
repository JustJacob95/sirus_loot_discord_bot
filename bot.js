// Require the necessary discord.js classes
const { Client, Intents, MessageEmbed, MessageAttachment  } = require('discord.js');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { token, guildId, channelId } = require('./config.json');



const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const intervalForUpdate = 7000;
let timerId = null;
let records = [];
let bossThumbnails = {
	"Разрушитель XT-002": "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-xt-002-deconstructor.png",
	"Фрея": "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-freya.png",
	"Торим": "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-thorim.png",
	"Огненный Левиафан":"https://wow.zamimg.com/images/wow/journal/ui-ej-boss-flame-leviathan.png",
	"Мимирон":"https://wow.zamimg.com/images/wow/journal/ui-ej-boss-mimiron.png",
	"Гидросс Нестабильный":"https://wow.zamimg.com/uploads/screenshots/small/30250.jpg",
	"Острокрылая":"https://wow.zamimg.com/images/wow/journal/ui-ej-boss-razorscale.png",
	"Повелитель Горнов Игнис":"https://wow.zamimg.com/images/wow/journal/ui-ej-boss-ignis-the-furnace-master.png",
	"Ходир":"https://wow.zamimg.com/images/wow/journal/ui-ej-boss-hodir.png",
	"Кологарн":"https://wow.zamimg.com/modelviewer/live/webthumbs/npc/222/28638.webp",
	"Йогг-Сарон":"https://wow.zamimg.com/images/wow/journal/ui-ej-boss-yogg-saron.png",
	"Генерал Везакс":"https://wow.zamimg.com/images/wow/journal/ui-ej-boss-general-vezax.png",
	"Железное Собрание":"https://wow.zamimg.com/uploads/screenshots/small/128853.jpg",
	"Ауриайя":"https://wow.zamimg.com/images/wow/journal/ui-ej-boss-auriaya.png",
	"Кель'тас Солнечный Скиталец":"https://wow.zamimg.com/uploads/screenshots/small/79291.jpg",
	"Повелитель глубин Каратресс":"https://wow.zamimg.com/uploads/screenshots/small/80609.jpg",
	"Ал'ар":"https://wow.zamimg.com/uploads/screenshots/small/29018.jpg",
	"Верховный звездочет Солариан":"https://wow.zamimg.com/uploads/screenshots/small/53912.jpg",
	"Страж Бездны":"https://wow.zamimg.com/uploads/screenshots/small/47202.jpg",
	"Леди Вайш": "https://wow.zamimg.com/uploads/screenshots/small/79290.jpg",
	"Морогрим Волноступ": "https://wow.zamimg.com/uploads/screenshots/small/28948.jpg",
	"Скрытень из глубин": "https://wow.zamimg.com/uploads/screenshots/small/81775.jpg",
	"Алгалон Наблюдатель": "https://wow.zamimg.com/uploads/screenshots/small/132856.jpg"
}
client.once('ready', () => {
	const channel = client.channels.cache.get(channelId);

	takeSceenshot = async (html, fileName) => {
		const browser = await puppeteer.launch();
		const page = await browser.newPage();
		const options = {
			path: 'images/'+fileName+'.png',
			fullPage: false,
			omitBackground: true
		};
		await page.setContent(html)
		await page.addStyleTag({url: 'https://sirus.su/tooltips/tooltip.css?v=4'})
		await page.addStyleTag({url: 'https://sirus.su/css/app.css?v=c7bb00c8'})
		await page.addStyleTag({content: '.s-wow-tooltip-body{margin-right: 15px;margin-bottom: 15px;border: 1px solid #737373;padding: 10px;}.s-wow-tooltip-body:last-child{margin-right: 0px}'})
		await page.screenshot(options);
		await browser.close();
	}

	let getLootInfo = async (item) => {
		if (item.inventory_type && item.level >= 277) {
			let responseLoot = await fetch('https://ru.api.sirus.su/api/tooltips/item/'+item.entry+'/9');
			let html = await responseLoot.text();
			return html.trim();
		}
		else{
			return '';
		}	
	}

	let getExtraInfo = async function(recordId) {
		var fileName = [...Array(10)].map(i=>(~~(Math.random()*36)).toString(36)).join('');
		let responceBossKillInfo = await fetch('https://ru.api.sirus.su/api/base/9/leader-board/bossfights/boss-kill/' + recordId);
		let dataBossKillInfo = await responceBossKillInfo.json();
		let lootHtml = await Promise.all(dataBossKillInfo.loots.map(loot => getLootInfo(loot.item)));
		let hasLootInfo = false;
		let thumbnail = '';
		lootHtml = lootHtml.join().replaceAll(',','');

		if (lootHtml) {
			let html = '<!doctype html> <html><body style="flex-wrap: wrap;height: auto; font-family: none !important;"><div style="display: flex;justify-content: center;">';
			hasLootInfo = true;
			html += lootHtml + '</div></body></html>';
			await takeSceenshot(html, fileName);
		}
		
		let exampleEmbed = new MessageEmbed().setColor('#0099ff')
						.setTitle("Упал босс " + dataBossKillInfo.boss_name)
						.setURL("https://sirus.su/base/ladder/pve/boss-kill/9/" + recordId)
						.addField('Попытки', dataBossKillInfo.attempts + "", true)
						.addField('Когда убили', dataBossKillInfo.killed_at, true)
						.addField('Время убийства', dataBossKillInfo.fight_length, true);

		if (typeof bossThumbnails[dataBossKillInfo.boss_name] != "undefined") {
			exampleEmbed.setThumbnail(bossThumbnails[dataBossKillInfo.boss_name])
		}

		
		if (hasLootInfo) {
			const attachment = new MessageAttachment('./images/' + fileName + '.png', fileName + '.png');
			exampleEmbed.addField('Лут: ', '\u200b', false);
			exampleEmbed.setImage('attachment://' + fileName + '.png');
			channel.send({embeds: [exampleEmbed], files: [attachment]});
		}
		else{
			channel.send({embeds: [exampleEmbed]});
		}
	};

	let getExtraInfoWrapper = async (record) => {
		if (record.guildId === guildId && records.indexOf(record.id) < 0 && record.boss_name) {
			await getExtraInfo(record.id);
			records.push(record.id);
		}
	}

	let getLatestKills = async function() {
		let responce = await fetch('https://ru.api.sirus.su/api/base/9/leader-board/bossfights/latest?realm=9');
		let listOfKills = await responce.json();
		let date_ob = new Date();
		await Promise.all(listOfKills['data'].map(record => getExtraInfoWrapper(record)))
		console.log('updated ' + date_ob.getHours() + ":" + date_ob.getMinutes() + ":" + date_ob.getSeconds());
		timerId = setTimeout(() => {
			getLatestKills();
		}, intervalForUpdate)
	}

	getLatestKills();
});

client.on('message', message => {
    let prefix = "!eye"
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    let messageArray = message.content.split(' ') // разделение пробелами
})

client.login(token);