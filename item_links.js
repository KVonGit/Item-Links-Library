"use strict"

/** 
 * 
 * @version 0.8
 * @author {@link https://github.com/KVonGit|KV}
 * @fileoverview Add hyperlink functionality to {@link https://github.com/ThePix/QuestJS|QuestJS} v 0.3.
 * 
 * ---
 * ###### **NOTE**
 * 
 * This library is now included in QuestJS as of QuestJS version 0.4, but the library is not
 * loaded by default.
 * 
 * View [the instructions](https://github.com/ThePix/QuestJS/wiki/Hyperlinks "https://github.com/ThePix/QuestJS/wiki/Hyperlinks") on the [QuestJS Wiki](https://github.com/ThePix/QuestJS/wiki).
 * 
 * This code is sometimes more up to date than the file which is included in Quest.
 * 
 * ---
 * #### These mods are not necessary, but I like to use them.
 * 
 * ```
 * lang.contentsForData.surface.prefix = 'on which you see ';
 * lang.contentsForData.surface.suffix = '';
 * lang.open_successful = "Done.";
 * lang.close_successful = "Done.";
 * lang.inside_container = "{nv:item:be:true} inside {sb:container}.";
 * lang.look_inside = "Inside, {nv:char:can} see {param:list}.";
 * lang.take_successful = "Taken.";
 * lang.drop_successful = "Dropped.";
 * ```
 */

 /** 
  * @namespace
  * @property {object} settings
  * @property {boolean} settings.linksEnabled - Enable item links and exit links
  * @example settings.linksEnabled = true;
  */
settings.linksEnabled = true;

/**
 * @namespace
 * @property {object} itemLinks
 * @property {function} itemLinks.update - keeps the verb links and exit links updated after each turn.
 * @see {@link updateAllItemLinkVerbs} & {@link updateExitLinks}
 */
const itemLinks = {};
io.modulesToUpdate.push(itemLinks);
itemLinks.update = function() {
	if(settings.linksEnabled){
		if(settings.debugItemLinks) {
			console.info("running itemLinks.update() to update verbs . . .");
		}
		updateAllItemLinkVerbs();
		updateExitLinks();
	}
};

/** 
 * @function updateAllItemLinkVerbs
 * @description Updates all verb links in items' dropdown menus
 * @see {@link updateItemLinkVerbs}
 */
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

/** 
 * @function updateItemLinkVerbs
 * @param {object} obj - The in-game item
 * @description Sets the current available verbs in the item link dropdown menu
 * @see {@link updateAllItemLinkVerbs} & {@link itemLinks}
 */
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

/** 
 * @function getArticle
 * @description Returns 'a', 'an', or 'the' when type is set to INDEFINITE or DEFINITE.
 * 
 * Returns <code>false</code> otherwise.
 * @param {object} item - The in-game item
 * @param {number} type - DEFINITE or INDEFINITE
 * @returns {string} 'a', 'an', or 'the' (or <code>false</code>)
 * @todo Should this simply <code>return</code> rather than <code>return false</code> if no type is requested?
 */
function getArticle(item, type){
	if (!type) return false;
	return type === DEFINITE ? lang.addDefiniteArticle(item) : lang.addIndefiniteArticle(item);
}

/** 
 * @function getDisplayAliasLink
 * @param {object} item - The in-game item
 * @param {object} [options] - Includes options such as 'article' (@see {@link getArticle})
 * @param {boolean} [cap] - If <code>true</code>, first letter of string will be capitallized
 * @return {string} - The item's link
 */
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

/**
 * @function handleExamineHolder
 * @description Used by npcs and containers to print a list of contents.
 * 
 * Must be manually added to an item's <code>nameModifierFunction</code>.
 * @param {object} params - Actually, this function does nothing with <code>params</code>
 * @todo Learn about name modifiers, because this code may be reinventing the wheel.
 */
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

/**
 * @function getContentsLink
 * @description Used for containers.  (NPCs use {@link getAllChildrenLinks}.)
 * @param {object} o - The in-game item
 * @returns {string} A string, which contains item links of the item's contents
 */
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

/**
 * @function canHold
 * @description Returns true if the item may have contents.
 * @param {object} obj - The in-game item
 * @returns {boolean} <code>true</code> if the item is a container, surface, or NPC
 */
function canHold(obj){
	return ( obj.container && ( !obj.closed || obj.transparent ) ) || obj.npc;
}

/**
 * @function getDirectChildren
 * @param {object} item - The in-game item
 * @description Returns an array of the item's direct children.
 * 
 * To return a recursive list, use {@link getAllChildren}.
 * @returns {array} Array of items
 */
function getDirectChildren(item){
	if (!item.getContents) return [];
	return item.getContents(item);
}

/** 
 * @function hasChildren
 * @param {object} item - The in-game item
 * @returns {boolean} <code>true</code> if the item is containing or carrying items.
 */
function hasChildren(item){
	return item.getContents(item).length > 0;
}

/**
 * @function getAllChildren
 * @param {object} item - The in-game item
 * @param {boolean} [isRoom] - Set to <code>false</code> by default.  If set to <code>true</code>, excludes the player and the player's inventory.
 * @returns {array} An array of items
 */
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

/**
 * @function getRoomContents
 * @param {object} room - The room item
 * @returns {array} An array of items in the room
 * @see {@link getAllChildren}
 */
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

/**
 * @function getAllChildrenLinks
 * @description Used for NPCs. (Containers use {@link getContentsLink}.)
 * @param {object} item - The in-game item
 * @returns {string} - String to display list of item's contents' links
 */
function getAllChildrenLinks(item){
	let kids = getDirectChildren(item);
	kids = kids.map(o => lang.getName(o,{modified:true,article:INDEFINITE}));
	return formatList(kids,{doNotSort:true, lastJoiner:lang.list_and, nothing:lang.list_nothing});
}

/**
 * @function getItemLink
 * @description Uses <code>{@link getName}</code> to return a link for the item.
 * @param {object} obj - The in-game item
 * @param {string} [id] - Optional display alias.  This parameter is not required.
 * @param {boolean} [capitalise] - Option to capitalize the first letter in the string.  Not required.  Default is <code>false</code>.
 * @returns {string} The item's link
 */
function getItemLink(obj, id='_DEFAULT_', capitalise=false){
	if(!settings.linksEnabled){
		var s = obj.alias || obj.name;
		return s;
	}
	var oName = obj.name;
	if (id === '_DEFAULT_'){
		 id = obj.alias || obj.name;
	}
	id = capitalise ? sentenceCase(id) : id;
	var dispAlias = lang.getNameOG(obj);
	var s = `<span class="object-link dropdown">`; 

	s +=`<span onclick="toggleDropdown($(this).next())" obj="${oName}" `+
	`class="droplink" name="${oName}-link">${id}</span>`;

	s += `<span obj="${oName}" class="dropdown-content">`;

	s += `<span obj="${oName}-verbs-list-holder">`;
	s += getVerbsLinks(obj);
	s += `</span></span></span>`;
	return s;
}

/** 
 * @function getVerbsLinks
 * @description Returns a string containing all available verbs for the item.
 * @param {object} obj - The in-game item
 * @returns {string} String list of verb links available for the item.
 * @see {@link getItemLink} 
 */
function getVerbsLinks(obj){
	let verbArr = obj.getVerbs();
	let oName = obj.name;
	let id = obj.alias || obj.name;
	let s = ``;
	if (verbArr.length>0){
		verbArr.forEach (o=>{
			o = sentenceCase(o);
			s += `<span class="list-link-verb" `+
			`onclick="$(this).parent().parent().toggle();handleObjLnkClick('${o} '+$(this).attr('obj-alias'));" `+
			`link-verb="${o}" obj-alias="${id}" obj="${oName}">${o}</span>`;
		})
	}
	return s;
}

/** 
 * @function toggleDropdown
 * @param {object} element - The HTML element
 * @description Toggles the display of the element
 */
function toggleDropdown(element) {
    $(element).toggle();
    var disp = $(element).css('display');
    let newDisp = disp === 'none' ? 'block' : 'block';
    $(element).css('display', newDisp);
    
}

/** 
 * @function handleObjLnkClick
 * @description Handles item link actions passed via clicking
 * @param {string} cmd The command to be parsed
 * @see {@link enterButtonPress}
 */
function handleObjLnkClick(cmd){
	enterButtonPress(cmd);
}

/** 
 * @function disableItemLink
 * @param {object} el - The item link class to be disabled
 * @description Disables the item link class. (Used when an item is out of scope.)
 */
function disableItemLink(el){
	let type = ''
	if ($(el).hasClass("dropdown")) type = 'dropdown'
	if ($(el).hasClass("droplink")) type = 'droplink' 
	$(el).addClass(`disabled disabled-${type}`).attr("name","dead-droplink").removeClass(type).css('cursor','default');
}

/** 
 * @function enableItemLinks
 * @param {object} el - The item link class to enable
 * @description Enables the item link class.  (Used when an item is in scope.)
 */
function enableItemLinks(el){
	let type = '';
	if ($(el).hasClass("disabled-dropdown")) type = 'dropdown'
	if ($(el).hasClass("disabled-droplink")) type = 'droplink'
	$(el).removeClass("disabled").removeClass(`disabled-${type}`).addClass(type).attr("name",$(el).attr("obj")).css("cursor","pointer");
}

/** 
 * @function enterButtonPress
 * @param {string} cmd - The player's command (normally 'entered' via click)
 * @description Inserts the clicked command into the textbox element, then parses as if the player typed it and pressed ENTER.
 * 
 * This also pushes the command to <code>io.savedCommands</code> for AGAIN purposes.  (This is exclusive to my game, not a default QuestJS thing!)
 */
function enterButtonPress(cmd){
	//Calling this function with no arg will cause s to default to the text in the textbox.
	if(cmd) $('#textbox').val(cmd);
	const s = $('#textbox').val();
    io.msgInputText(s); //This emulates printing the echo of the player's command
    if (s) {
		if (io.savedCommands[io.savedCommands.length - 1] !== s) {
			io.savedCommands.push(s);
        }
        io.savedCommandsPos = io.savedCommands.length;
        parser.parse(s);
        $('#textbox').val('');
	}
}

/** 
 * @function updateExitLinks
 * @description Updates all the exit links, making sure only available exits have enabled links.
 * @see {@link itemLinks|itemLinks.update}
 */
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

//------
// MODS
//------

/**
 * @namespace
 * @property {object} util
 * @property {function} util.listContents
 * @param {object} situation - I'm honestly not sure what this is for. 
 * @param {boolean} [modified] - Not required.  Set to true by default, to invoke the item's name modifier functions.
 * @description ##### MODDED to return an array of strings containing item links
 * 
 * NOTE: <code>this</code> targets the in-game item
 * @see {@link getAllChildrenLinks}
 * @returns	{array} Array of strings of item links
 */
util.listContents = function(situation, modified = true) {
  let objArr = getAllChildrenLinks(this);
 return objArr
};

// MOD!!!
findCmd('Inv').script = function() {
  if (settings.linksEnabled) {
	  msg(lang.inventoryPreamble + " " + getAllChildrenLinks(game.player) + ".");
	  return settings.lookCountsAsTurn ? world.SUCCESS : world.SUCCESS_NO_TURNSCRIPTS;
  }
  let listOfOjects = game.player.getContents(world.INVENTORY);
  msg(lang.inventoryPreamble + " " + formatList(listOfOjects, {lastJoiner:lang.list_and, modified:true, nothing:lang.list_nothing, loc:game.player.name}) + ".");
  return settings.lookCountsAsTurn ? world.SUCCESS : world.SUCCESS_NO_TURNSCRIPTS;
};

/** 
 * @namespace
 * @property {object} lang
 * @property {function} lang.getNameOG - The original <code>lang.getName</code>, with a new name
 * @param {object} item - The in-game item 
 * @param {object} options - The options can include indefinite or definite article, possessive, pronoun, count, or pluralAlias.
 * @returns {string} String with the item's item link or a pronoun with no link
 */
lang.getNameOG = lang.getName;

/**
 * @namespace
 * @property {object} lang
 * @property {function} lang.getName - Modified for this library to return an item link.
 * @param {object} item - The in-game item 
 * @param {object} [options] - The options can include indefinite or definite article, possessive, pronoun, count, or pluralAlias.
 * @returns {string} String with the item's item link or a pronoun with no link
 */
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

/**
 * @namespace
 * @property {object} tp
 * @property {array} tp.text_processors
 * @property {function} tp.text_processors.exits
 * @description MODIFIED to return a string containing a list of exit links.
 * @param {array} arr
 * @param {object} params
 * @returns A string containing a list of exit links
 */
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


//----------------
// END OF MODS
//----------------


//Capture clicks for the objects links
/**
 * @namespace
 * @property {object} settings
 * @property {array} settings.clickEvents
 * @description Keeps track of clicked events in order to close one dropdown when another dropdown is clicked.
 */
settings.clickEvents = [{one0:`<span>_PLACEHOLDER_</span>`}];

/**
 * @namespace
 * @property {object} window
 * @property {function} window.onclick
 * @param	{object} event
 * @description Handles item link clicks.
 * @see {@link clickEvents|settings.clickEvents}
 */
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

