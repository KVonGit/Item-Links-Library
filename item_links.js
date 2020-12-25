"use strict"

//@DOC
// ## ITEM LINKS LIB
//
// VERSION 0.10
//
// AUTHOR: KV
//
// DESCRIPTION:  Add hyperlink functionality to [QuestJS](https://github.com/ThePix/QuestJS)
//
// (Documentation generated by [PixDocs](https://github.com/ThePix/PixDocs))
//
//---
//
// ##### **NOTE**
//
// #####  This library is now included in [QuestJS](https://github.com/ThePix/QuestJS) as of QuestJS version 0.4, but this library is not loaded by default.
//
// #####  View [the setup instructions](https://github.com/ThePix/QuestJS/wiki/Hyperlinks).
//
//---
//@UNDOC

//@DOC
// ### Boolean: _settings.linksEnabled_
//
// Set to ```true``` by this library to enable the links
//
// ---
//@UNDOC
settings.linksEnabled = true;

//@DOC
//### Function: _itemLinks.update_()
//
// Keeps the verb links and exit links updated after each turn.
//
//---
//@UNDOC
const itemLinks = {};
io.modulesToUpdate.push(itemLinks);
itemLinks.update = function() {
	if(settings.linksEnabled){
		updateAllItemLinkVerbs();
		updateExitLinks();
	}
};

//@DOC
// Updates all verb links in items' dropdown menus
//
//---
function updateAllItemLinkVerbs(){
	let verbEls = $("[link-verb]");
	Object.keys(verbEls).forEach(i => {
		let el = verbEls[i];
		let objName = $(el).attr("obj");
		if (!objName) return;
		let obj = w[objName];
		updateItemLinkVerbs(obj);
	})
}

//@DOC
// Sets the current available verbs in the item link dropdown menu
// 
// **PARAM:**
//
// - ```obj``` - **&lt;OBJECT&gt;** The in-game item
//
//---
function updateItemLinkVerbs(obj){
	let oName = obj.name;
	if (!obj.scopeStatus) {
		disableItemLink($(`[obj="${oName}"]`));
		return;
	}
	enableItemLinks($(`[obj="${oName}"]`));
	let id = obj.alias || obj.name;
	let el = $(`[obj='${oName}-verbs-list-holder'`);
	let endangered = el.hasClass("endangered-link") ? "endangered-link" : "";
	let newVerbsEl = getVerbsLinks(obj, endangered);
	el.html(newVerbsEl);
}

//@DOC
// Returns **&lt;STRING&gt;**
//
// - **'a'**, **'an'**, or **'the'** when type is set to ```INDEFINITE``` or ```DEFINITE```.
//
// Returns ```undefined``` otherwise.
// 
// **PARAMS:**
//
//  - ```item``` - **&lt;OBJECT&gt;** The in-game item
//
//  - ```type``` - **&lt;BOOLEAN&gt;** [OPTIONAL] ```DEFINITE``` or ```INDEFINITE``` (leaving this empty yields no article)
//
// ---
function getArticle(item, type){
	if (!type) return;
	return type === DEFINITE ? lang.addDefiniteArticle(item) : lang.addIndefiniteArticle(item);
}

//@DOC
// Returns **&lt;STRING&gt;**
//
// - the item's display alias as an item link
//
// **PARAMS:**
// 
//  - ```item``` - **&lt;STRING&gt;** The in-game item
// 
//  - ```options``` - **&lt;OBJECT&gt;** containing various option settings
// 
//  - ```cap``` - **&lt;BOOLEAN&gt;** - ```true``` to capitalize the first letter
//
//---
function getDisplayAliasLink(item, options, cap){
	let art = false;
	if (options) art = options.article
	let article = getArticle(item, art)
	if (!article) {
		article = '';
	}
	let s = article + getItemLink(item);
	s = s.trim();
	return s;
}

//@DOC
// Used by npcs and containers. Print a list of item's contents (with links).
//
// Must be manually added to an item's examine attribute, if wanted.
//
// Prints a sentence in-game describing what the holder contains (or is carrying) via ```msg``` 
//
//  **PARAM:**
//
//  - ```params``` - **&lt;OBJECT&gt;** This function doesn't even use any args.  (I just noticed this!)
//
//---
function handleExamineHolder(params){
	let obj = parser.currentCommand.objects[0][0];
	if (!obj) return;
	if (!obj.container && !obj.npc) return;
	if (obj.container) {
		if (!obj.closed || obj.transparent) {
			let contents = obj.getContents();
			contents = contents.filter(o => !o.scenery)
			if (contents.length <= 0){
				return;
			}
			let pre = obj.contentsType === 'surface' ? lang.on_top : lang.inside;
			pre = sentenceCase(pre);
			let subjVerb = processText("{pv:pov:see}", {pov:game.player});
			pre += `, ${subjVerb} `;
			contents = settings.linksEnabled ? getContentsLink(obj) : contents;
			msg(`${pre}${contents}.`);
		}
	} else {
		let contents =  getAllChildrenLinks(obj)
		if (contents == 'nothing') return;
		let pre = processText('{pv:char:be:true} ' + lang.carrying, {char:obj});
		msg(`${pre} ${contents}.`);
	}
}

//@DOC
// Used for containers.  (NPCs use [getAllChildrenLinks](#Function-getAllChildrenLinksitem).)
//
// Returns **&lt;STRING&gt;**
//
// -  item links of the item's contents
//
//  **PARAM:**
//
//  - ```o``` - **&lt;OBJECT&gt;** The in-game item
//
//---
function getContentsLink(o) {
  let s = '';
  const contents = o.getContents(world.LOOK);
  if (contents.length > 0 && (!o.closed || o.transparent)) {
    if (!o.listContents) {
		return getAllChildrenLinks(o);
	}
	s = o.listContents(world.LOOK);
  }
  return s
}

//@DOC
//  Returns **&lt;BOOLEAN&gt;**
//
//  - ```true``` if the item is capable of having contents.
//
//  **PARAM:**
//
//  - ```obj``` - **&lt;OBJECT&gt;** The in-game item
//
//---
function canHold(obj){
	return ( obj.container && ( !obj.closed || obj.transparent ) ) || obj.npc;
}

//@DOC
//  Returns **&lt;ARRAY&gt;**
//
//  - item's direct children
//
// **NOTE**
//
// - For a recursive search, use [getAllChildren](#function-getallchildrenitem-isroomfalse).
//
// **PARAM:**
//
// - ```item``` - **&lt;OBJECT&gt;** The in-game item
//
//---
function getDirectChildren(item){
	if (!item.getContents) return [];
	return item.getContents(item);
}

//@DOC
// Returns **&lt;BOOLEAN&gt;**
//
// - ```true``` if the item is containing (or carrying) items
//
// **PARAM:**
//
// - ```item``` - **&lt;OBJECT&gt;** The in-game item
//
//---
function hasChildren(item){
	return item.getContents(item).length > 0;
}

//@DOC
// Set to ```false``` by default.  If set to ```true```, this excludes the player and the player's inventory.
//
// Returns **&lt;ARRAY&gt;**
//
// - items carried by ```item```
//
// **PARAMS:**
//
// - ```item``` - **&lt;OBJECT&gt;** The in-game item
//
// - ```isRoom``` - **&lt;BOOLEAN&gt;** [OPTIONAL] ```false``` by default (```true``` excludes player and inventory) 
//
//---
function getAllChildren(item, isRoom=false){
	let result = [];
	let children = getDirectChildren(item);
	if (isRoom){
		children = children.filter(o =>o != game.player);
	}
	if (children.length < 1) return [];
	children.forEach(child => {
		result.push(child);
		let grandchildren = child.getContents ? child.getContents(child) : [];
		if (grandchildren.length > 0){
			result.push(getAllChildren(child));
		}
	})
	return result;
}

///@DOC
// Returns **&lt;ARRAY&gt;**
//
// - items in the room
//
//  **PARAM:**
//
//  - ```room``` - **&lt:OBJECT&gt;** The in-game object
//
//---
function getRoomContents(room){
	let result = [];
	let children = getAllChildren(room, true);
	if (children.length < 1) return [];
	children.forEach(child => {
		result.push(child);
		let grandchildren = child.getContents ? child.getContents(child) : [];
		if (grandchildren.length > 0){
			result.push(getAllChildren(child));
		}
	})
	return result;
}

//@DOC
// Used for NPCs. (Containers use [getContentsLink](#Function-getContentsLinko).)
//
// Returns **&lt;STRING&gt;**
//
// - item's contents' links
//
// **PARAM:**
//
// - ```item``` - **&lt;OBJECT&gt;** The in-game item
//
//---
function getAllChildrenLinks(item){
	let kids = getDirectChildren(item);
	kids = kids.map(o => lang.getName(o,{modified:true,article:INDEFINITE}));
	return formatList(kids,{doNotSort:true, lastJoiner:lang.list_and, nothing:lang.list_nothing});
}

//@DOC
// Uses modified [lang.getName](#function-langgetnameitem-options) to return a string with a link for the item.
//
// Returns **&lt;STRING&gt;**
//
// - The item's link
//
// **PARAMS:**
//
// - ```obj``` - **&lt;OBJECT&gt;** The in-game item
//
//---
function getItemLink(obj, id='_DEFAULT_', capitalise=false){
	if(!settings.linksEnabled){
		let s = lang.getNameOG(obj,{capitalise:capitalise});
		return s;
	}
	let oName = obj.name;
	if (id === '_DEFAULT_'){
		 id = obj.alias || obj.name;
	}
	id = capitalise ? sentenceCase(id) : id;
	let s = `<span class="object-link dropdown">`; 

	s +=`<span onclick="toggleDropdown($(this).next())" obj="${oName}" `+
	`class="droplink" name="${oName}-link">${id}</span>`;

	s += `<span obj="${oName}" class="dropdown-content">`;

	s += `<span obj="${oName}-verbs-list-holder">`;
	s += getVerbsLinks(obj);
	s += `</span></span></span>`;
	return s;
}

//@DOC
// Returns **&lt;STRING&gt;**
//
// - all available verbs for the item.
//
// **PARAM:**
//
// - ```obj``` - **&lt;OBJECT&gt;** The in-game item
//
//---
function getVerbsLinks(obj){
	let verbArr = obj.getVerbs();
	let oName = obj.name;
	let id = obj.alias || obj.name;
	let s = ``;
	if (verbArr.length>0){
		verbArr.forEach (o=>{
			o = sentenceCase(o);
			s += `<span class="list-link-verb" `+
			`onclick="$(this).parent().parent().toggle();runCmd('${o} '+$(this).attr('obj-alias'));" `+
			`link-verb="${o}" obj-alias="${id}" obj="${oName}">${o}</span>`;
		})
	}
	return s;
}

//@DOC
//  Toggles the display of the element
//
// **PARAM:**
//
// - ```element``` - **&lt;OBJECT&gt;** The HTML element
//
//---
function toggleDropdown(element) {
    $(element).toggle();
    let disp = $(element).css('display');
    let newDisp = disp === 'none' ? 'block' : 'block';
    $(element).css('display', newDisp);
    
}

//@DOC
//  Disables the item link class. (Used when an item is out of scope.)
//
// **PARAM:**
//
// - ```el``` - **&lt;OBJECT&gt;** The HTML element
//
//---
function disableItemLink(el){
	let type = ''
	if ($(el).hasClass("dropdown")) type = 'dropdown'
	if ($(el).hasClass("droplink")) type = 'droplink' 
	$(el).addClass(`disabled disabled-${type}`).attr("name","dead-droplink").removeClass(type).css('cursor','default');
}

//@DOC
//  Enables the item link class.  (Used when an item is in scope.)
//
// **PARAM:**
//
// - ```el``` - **&lt;OBJECT&gt;** The HTML element
//
//---
function enableItemLinks(el){
	let type = '';
	if ($(el).hasClass("disabled-dropdown")) type = 'dropdown'
	if ($(el).hasClass("disabled-droplink")) type = 'droplink'
	$(el).removeClass("disabled").removeClass(`disabled-${type}`).addClass(type).attr("name",$(el).attr("obj")).css("cursor","pointer");
}

//@DOC
//  Updates all the exit links, making sure only available exits have enabled links.
//
//---
function updateExitLinks(){
	const exits = util.exitList();
	let link = $(`.exit-link`);
	if (link.length > 0){
		Object.values(link).forEach(el => {
			let dir = $(el).attr('exit');
			if (!dir) return
			let ind = exits.indexOf(dir);
			if (ind < 0) {
				$(el).addClass("disabled")
				el.innerHTML = dir;
			} else {
				$(el).removeClass("disabled");
				el.innerHTML = processText(`{cmd:${dir}}`);
			}
		})
	}
}

//@DOC
// Disables ALL item links, command links, and exit links.  (Used by modified [io.finish](#function-iofinish).)
//
//---
function disableAllLinks(){
	let elArr = $('.exit-link');
	Object.values(elArr).forEach(el => {
		if ($(el).hasClass("exit-link")){
			let dir = $(el).attr('exit');
			$(el).addClass("disabled");
			el.innerHTML = dir;
		}
	})
	elArr = $(".dropdown");
	Object.values(elArr).forEach(el => {
		if ($(el).attr("name")){
			disableItemLink(el);
		}
	})
	elArr = $(".droplink");
	Object.values(elArr).forEach(el => {
		if ($(el).attr("name")){
			disableItemLink(el);
		}
	})
	elArr = $(".cmd-link");
	Object.values(elArr).forEach(el => {
		if ($(el).hasClass("cmd-link")){
			$(el).attr("onclick","");
			$(el).addClass("disabled");
		}
	})
}

//@DOC
// ### Modified Functions
//@UNDOC

//@DOC
// ### Function: _util.listContents_(situation, modified = true)
//
//  Modified to return an array of strings containing item links
//
//  Returns **&lt;ARRAY&gt;**
//
//  - strings with object links
//
//  **PARAMS:**
//
//  - ```situation``` - **&lt;OBJECT&gt;** TODO: Find out what this was for! I don't even use it!
//
// - ```modified``` - **&lt;BOOLEAN&gt;** [OPTIONAL] ```true``` by default. (TODO: Make sure this arg is no longer needed, since I'm not using it.)
//
// ---
//@UNDOC
util.listContents = function(situation, modified = true) {
  let objArr = getAllChildrenLinks(this);
 return objArr
};

//@DOC
// ### Function: _io.finishBak_
//
// A backup of the original ```iofinish```
//
// (This mod added in version 0.9)
//
// ---
//@UNDOC
io.finishBak = io.finish;

//@DOC
// ### Function: _io.finish_()
//
//  Ends the story.  Modified to disable all item and object links beforehand.
//
//(Mod added to this library in version 0.9)
//
// ---
//@UNDOC
io.finish = () => {
	disableAllLinks();
	io.finishBak();
};

//@DOC
// ### Function: _findCmd('Inv').script_()
//
//  Modifies ```Inv``` command's script to print recursive contents links.
//
// ---
//@UNDOC
findCmd('Inv').script = function() {
  if (settings.linksEnabled) {
	  msg(lang.inventoryPreamble + " " + getAllChildrenLinks(game.player) + ".");
	  return settings.lookCountsAsTurn ? world.SUCCESS : world.SUCCESS_NO_TURNSCRIPTS;
  }
  let listOfOjects = game.player.getContents(world.INVENTORY);
  msg(lang.inventoryPreamble + " " + formatList(listOfOjects, {lastJoiner:lang.list_and, modified:true, nothing:lang.list_nothing, loc:game.player.name}) + ".");
  return settings.lookCountsAsTurn ? world.SUCCESS : world.SUCCESS_NO_TURNSCRIPTS;
};

//@DOC
// ### Function: _lang.getNameOG_(item, options)
//
// The original ```lang.getName```, with a new name
//
// Returns **&lt;STRING&gt;**
//
// - item's display alias or a pronoun, either way there is no item link
//
//
// **PARAMS:**
//
// - ```item``` - **&lt;OBJECT&gt;** The in-game item
//
// - ```options``` - **&lt;OBJECT&gt;** JS object with various properties
//
// ---
//@UNDOC
lang.getNameOG = lang.getName;

//@DOC
// ### Function: _lang.getName_(item, options)
//
// **Modified** for this library to return an item link.
//
// Returns **&lt;STRING&gt;**
//
// - the item's item link (or a pronoun with no link)
//
// **PARAMS:**
//
// - ```item``` - **&lt;OBJECT&gt;** The in-game item
//
// - ```options``` - **&lt;OBJECT&gt;** JS object with various properties
//
//---
//
//@UNDOC
lang.getName = (item, options) => {
    if (!settings.linksEnabled) {
		return lang.getNameOG(item, options);
	}
	if (!options) options = {}
    if (!item.alias) item.alias = item.name
    let s = ''
    let count = options[item.name + '_count'] ? options[item.name + '_count'] : false
    if (!count && options.loc && item.countable) count = item.countAtLoc(options.loc)

    if (item.pronouns === lang.pronouns.firstperson || item.pronouns === lang.pronouns.secondperson) {
	  s = options.possessive ? item.pronouns.poss_adj : item.pronouns.subjective;
      s += util.getNameModifiers(item, options); // ADDED by KV
      return s; // ADDED by KV
    }

    else {    
      if (count && count > 1) {
        s += lang.toWords(count) + ' '
      }
      if (item.getAdjective) {
        s += item.getAdjective()
      }
      if (!count || count === 1) {
        s += item.alias
      }
      else if (item.pluralAlias) {
        s += item.pluralAlias
      }
      else {
        s += item.alias + "s"
      }
      if (options.possessive) {
        if (s.endsWith('s')) {
          s += "'"
        }
        else { 
          s += "'s"
        }
      }
    }
    let art = getArticle(item, options.article);
    if (!art) art = '';
    let cap = options && options.capital;
    if (!item.room) s = getItemLink(item, s, cap);
    s = art + s;
    s += util.getNameModifiers(item, options);
    return s;
};

//@DOC
// ### Function: _tp.text_processors.exits(arr, params)
//
//  Modified to return a string containing a list of exit links.
//
// Returns **&lt;STRING&gt;**
//
// - string with a list of exit links
//
// **PARAMS:**
//
// - ```arr``` - **&lt;ARRAY&gt;** TODO: Ask Pixie how to describe this.
//
// - ```params``` - **&lt;OBJECT&gt;** TODO: Ask Pixie how to describe this.
//
// ---
//@UNDOC
tp.text_processors.exits = function(arr, params) {
  let elClass = settings.linksEnabled ? `-link` : ``;
  const list = [];
  util.exitList().forEach(exit => {
	  let s = settings.linksEnabled ? `{cmd:${exit}}` : `${exit}`;
	  let el = processText(`<span class="exit${elClass}" exit="${exit}">${s}</span>`);
	  list.push(el);
  })
  return formatList(list, {lastJoiner:lang.list_or, nothing:lang.list_nowhere});
}


//@DOC
// ## Click capturing
//@UNDOC

//@DOC
// ### Array: _settings.clickEvents_
//
// Used to capture clicks for the objects links
//
// ---
//@UNDOC
settings.clickEvents = [{one0:`<span>_PLACEHOLDER_</span>`}];

//@DOC
// ### Event listener: _window.onclick_(event)
//
// Handles item link clicks.
//
//
// Keeps track of clicked events in order to close one dropdown when another dropdown is clicked.
//
// ---
//@UNDOC
window.onclick = function(event) {
	if (!event.target.matches('.droplink')) {
		$(".dropdown-content").hide();
	}else{
		settings.clickEvents.unshift(event.target);
		if (typeof(settings.clickEvents[1].nextSibling)!=='undefined' &&  settings.clickEvents[1].nextSibling!==null){
			if (settings.clickEvents[1] !== event.target && settings.clickEvents[1].nextSibling.style.display==="block" && event.target.matches('.droplink')){
				$(".dropdown-content").hide();
				event.target.nextSibling.style.display="block";
			}
		}
	}
}

//@DOC
// [Back to top](#item-links-lib)
//@UNDOC