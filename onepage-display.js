/**
 * INTERSEL - 4 cité d'Hauteville - 75010 PARIS
 * RCS PARIS 488 379 660 - NAF 721Z
 *
 * File : onepage-display.js
 * Object : affichage et gestion du one-page...
 *
 * Modifications :
 * - 2013/10/13 - EPO - V1.0.0 - Creation
 *
 * @copyright : Intersel 2013
 * @author : michael.petit@intersel.fr / emmanuel.podvin@intersel.fr
 * @version : V1.0.0
 *
 */

var OnePageDisplay = function ( options ) {

	// les options par défaut
	/*
	 * @param OnePageItems			: selector to find the page items
	 * 									remark : each page item should have a PageIdAttributeOnItem ('data-pageid') attribute
	 * @param PrefixPageIdOnItem 	: prefix set on the id set in a PageIdAttributeOnItem attribute
	 * 								  ex: if PrefixPageIdOnItem='pageid_' : 'pageid_22'
	 * @param PageIdAttributeOnItem : attribute where is set the page id on a page item found in 'OnePageItems'
	 * @param debug					: if true then the debug messages are displayed on the console
	 * @param LogLevel				: 0: same as debug = false; 1: display errors; 2: errors+warning; 3: errors+warning+notice
	 */
	var $defaults = {
		GeneralContainer	: '#wrap-site-content',
		OnePageContainer	: 'section.onePage',
		OnePageItems		: 'section.onePage > article, section.onePage > div > article, .onePage-item',
		OnePageEnableMenus	: 'data-onepage="enabled"',
		OnePageIdMenus		: 'data-onepage-id',
		PrefixPageIdOnItem	: 'pageid_',
		PageIdAttributeOnItem : 'data-pageid',
		MessageToDisplayDuringLoad	: '', /*
			'<div id="LoadingMessage">'
				+"Pour une expérience utilisateur optimale<br>"
						+"de notre site, utilisez un navigateur récent<br>"
						+"tel que Chrome, Firefox ou IE10..."
				+'</div>',*/
		MaxDisplaysOfTheMessage : 3,
		MW_MinHeightDetect	: 30,
		MW_MaxHeightDetect	: 350,
		LoaderDuration		: 300,
		debug				: true,
		LogLevel			: 3,
		AlertError			: false,
		navigator_list_for_smooth	: {chrome:'chrome'}, //opera|chrome|safari|firefox|msie|trident
	}

	/*
	 * @param opts - options du OnePage
	 */
	this.opts = jQuery.extend( {}, $defaults, options || {});

	/*
	 * @param {object} loader	- définition du loader OnePage
	 */
	this.loader = jQuery('<div/>', {
		'id'	: 'OPLoader',
		'class'	: 'ajax-loader',
		'width'	: jQuery( window ).width(),
		'height'	: jQuery( window ).height(),
		'top'		: $(this.opts.GeneralContainer).offset().top,
		'background-position' : 'center ' + (jQuery( window ).height() / 5) + 'px',
	});
	
	/*
	 * @myPageItems		- the page item objects
	 */
	this.myPageItems 	= null;

	/*
	 * @param WindowHeight	- height of the main window
	 */
	this.WindowHeight	= 0;
	
	/*
	 * @param DocumentHeight	- height of the total document
	 */
	this.DocumentHeight	= 0;
	
	/*
	 * @param topContainer	- position of top container of the onePage
	 * generally it's the position of the first page Item
	 */
	this.topContainer	= 0;

	/*
	 * currentPageId - current page displayed
	 */
	this.currentPageId= 0;

	/*
	 * currentPageUrl - url of the page requested from ajax to be displayed (cf. gotourl)
	 */
	this.currentPageUrl= '/';
	

	/*
	 * _initializeOnePage - initialise a OnePage
	 * state function
	 * @param param - input parameters defined for the function in the state
	 * @param event -  jQuery event that was triggered
	 * @param data - data linked to the event
	 * 				- {'url','goturl'} 
	 * @param this - FSM object
	 * @return boolean - false if not initialised
	 * 
	 */
	var _initializeOnePage = function (param, event, data)
	{
		var thisOP = this.opts.OnePageObject;
		thisOP.log('_initializeOnePage');
		
		if ( (data != null) && (data.gotourl != null) )
		{
			thisOP.currentPageUrl = data.gotourl;
		}
		return thisOP.initializeOnePage();

	}
	// methode d'affichage du loader
	var _showLoader = function () {
		var thisOP = this.opts.OnePageObject;
		thisOP.log('_showLoader');

		// si le loader n'est pas encore présent dans le contenu alors on l'insère
		if ( !$('.ajax-loader').length )
			$(thisOP.opts.GeneralContainer).before( thisOP.loader );
		
		//display of a message during the loading?
		if (thisOP.opts.MessageToDisplayDuringLoad) 
		{
			if (thisOP.opts.MaxDisplaysOfTheMessage > 0)
			{
				$('.ajax-loader').html(thisOP.opts.MessageToDisplayDuringLoad);
				thisOP.opts.MaxDisplaysOfTheMessage -= 1;
			}
			else
			{
				$('.ajax-loader').html('');
			}
		}

		$('.ajax-loader').width($(window).width());
		// et on joue l'animation d'affichage
		$('.ajax-loader').stop().fadeIn( thisOP.opts.LoaderDuration );
	}

	// methode de masquage du loader
	var _hideLoader = function () {
		var thisOP = this.opts.OnePageObject;
		thisOP.log('_hideLoader');

		$('.ajax-loader').stop().fadeOut( thisOP.opts.LoaderDuration );
	}

	/*
	 * @return string - name of the browser opera|chrome|safari|firefox|msie|trident
	 */
	var _navigator_sayswho = function(){
	    var ua= navigator.userAgent, tem, 
	    M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*([\d\.]+)/i) || [];
	    if(/trident/i.test(M[1])){
	        tem=  /\brv[ :]+(\d+(\.\d+)?)/g.exec(ua) || [];
	        return 'IE '+(tem[1] || '');
	    }
	    M= M[2]? [M[1], M[2]]:[navigator.appName, navigator.appVersion, '-?'];
	    if((tem= ua.match(/version\/([\.\d]+)/i))!= null) M[2]= tem[1];
	    return M.join(' ');
	};
	/*
	 * State definition
	 * leave the states after the function definition
	 */
	
	/*
	 * ManageStickyAnimation
	 */
	var ManageStickyAnimation = {
		NoStickyAnimation	:
			{
			OP_set_mousewheel	:
				{
				init_function	: 
					function(param,event,delta) 
					{
						delta = (delta < 0)? -1:+1;
						var aPageToStick = this.opts.OnePageObject.whoHasToBeSticked(delta);
						if (aPageToStick) 
							this.trigger('OP_animate_sticky',aPageToStick);
						this.trigger('OP_move_scroll');//some browser send the scroll event, other don't so always send one...
					},
				prevent_bubble : true,
				out_function 	:  
					function(){
						if (Math.abs(this.opts.lastSticky - $(document).scrollTop()) > this.opts.OnePageObject.opts.MW_MaxHeightDetect) this.opts.lastSticky = -10000;
						//this.opts.OnePageObject.log('OP_set_mousewheel : '+this.opts.lastSticky+'-'+$(document).scrollTop());
						this.returnStatus=false;//stop mousewheel bubbling
					},
				},
			OP_animate_sticky:
				{
				//how_process_event 	: {delay:200},//help to  smooth the sticky
				process_event_if	: "(Math.abs(this.opts.lastSticky - $(document).scrollTop()) > this.opts.OnePageObject.opts.MW_MaxHeightDetect)", 
				init_function		: 
					function(param,event,aPageToStick) 
					{
						$(document).trigger('stop_listening_mousewheel');
						this.opts.OnePageObject.animateStickyPage(aPageToStick);
					},
				next_state 			: 'StickyAnimation',
				prevent_bubble 		: true,
				out_function		: function(){this.opts.lastSticky = $(document).scrollTop();},//as it processed, reinit lastscroll
				},
			},
		StickyAnimation	:
		{
			enterState :
				{
				propagate_event 	:'OP_wait_for_nosticky',
				//init_function		: function(){$(document).trigger('stop_listening_mousewheel');},//stop scrolling with mousewheel
				},
			OP_wait_for_nosticky : //hack : if not receiving the OP_animation_finished... but actually we should receive it ;-)
				{
				how_process_event 	: {delay:1500},
				propagate_event 	:'OP_animation_finished',
				},
			OP_animation_finished	:
				{
				next_state	: 'NoStickyAnimation',
				prevent_bubble : true,
				},
		},
		DefaultState :
		{
		start :
			{
			init_function		: function(){this.opts.lastSticky = -10000;},
			next_state : 'NoStickyAnimation',
			}
		}
	}//end manageStickyAnimation
	
	/*
	 * ManageScrollStates
	 */
	var ManageScrollStates = {
		WaitForAction	:
		{
			OP_PageToGo:
				{
				init_function:function (param,event,page_id){this.opts.OnePageObject.scrollToPage(page_id);},
				prevent_bubble : true,
				next_state		: 'setMenu',
				},
			OP_move_scroll		:
				{
				how_process_event 	: {delay:100},//in order to not compute every scroll...
				process_event_if	: "(Math.abs(this.opts.lastScrollOn - $(document).scrollTop()) > 100)",
				next_state			: 'setMenu',
				prevent_bubble 		: true,
				out_function		: function(){this.opts.lastScrollOn = $(document).scrollTop();},
				},
		},
		setMenu	:
		{
			enterState		:
				{
				propagate_event	: 'setMenu',
				},
			setMenu		:
				{
				how_process_event 	: {delay:100},//tempo for IE as $(document).scrollTop() is not automatically updated after the scroll of pageToGo...  
				prevent_bubble 	: true,
				next_state		: 'WaitForAction',
				},
		},
		DefaultState :
			{
			start :
				{
				next_state : 'WaitForAction',
				init_function		: function(){this.opts.lastScrollOn = $(document).scrollTop();},
				}
			}
	};
	
	var ManagePageChange =
	{
		JustReloaded :
		{
			//events that should regenerate the OnePage values
			OP_OnePageChange	:
				{
				propagate_event : 'OP_reinit_onepage_fromstart',
				prevent_bubble 		: true,
				},
			OP_start_countdown :
				{
				how_process_event 	: {delay:4000},
				prevent_bubble 		: true,
				next_state			: 'Reloaded',
				},
		},
		Reloaded :
		{
			//events that should regenerate the OnePage values
			OP_OnePageChange	:
				{
				propagate_event : 'OP_reinit_onepage',
				prevent_bubble 		: true,
				},
		},
		DefaultState :
		{
			start :
				{
				next_state : 'Reloaded',
				},
			OP_new_page_ready :
				{
				propagate_event : 'OP_start_countdown',
				next_state : 'JustReloaded',
				}
		}
	}

	/**
	 * ManageNotOnePageStates - management of the transition from not one page to a one page
	 */
	var ManageNotOnePageStates = {
		/*state list*/
		NotOnePage 			:
		{
			// a new page was just loaded...
			// Extern event
			OP_new_page_loaded	:
				{
				init_function		: _initializeOnePage,
				next_state			: 'WaitToTestPageReadiness',
				propagate_event		: 'OP_initialized',
				prevent_bubble 		: true,
				},
			OP_redo_reinit	:
			{
				propagate_event		: 'OP_new_page_loaded',
				prevent_bubble 		: true,
			},
			//used when the content of a page changed...
			// Extern event
			OP_reinit_onepage	:
			{
				init_function		: _initializeOnePage,
				next_state_when		: "this.opts.OnePageObject.testIfReady() == true",
				next_state			: 'PageReadyAfterReinit',
				propagate_event		: 'OP_is_page_ready',
				prevent_bubble 		: true,
			},
			OP_is_page_ready	:
			{
				propagate_event		: 'OP_new_page_loaded',
				prevent_bubble 		: true,
			},
		},
		WaitToTestPageReadiness		:
		{
			OP_initialized	:
			{
				next_state			: 'TestPageReadiness',
				how_process_event 	: {delay:500},
				propagate_event		: 'OP_test_page',
				prevent_bubble 		: true,
			},
		},
		TestPageReadiness	:
		{
			OP_test_page	:
			{
				next_state			: 'PageReady',
				next_state_when		: "(this.opts.OnePageObject.testIfReady() == true)",
				propagate_event		: 'OP_is_page_ready',
				prevent_bubble 		: true,
			},
			OP_is_page_ready	: //if there -> not good! means that we did not change state :-s so restart...
			{
				how_process_event 	: {delay:200},//wait a little hoping the content will be more stable
				propagate_event		: 'OP_redo_reinit',//go to starting point...
				next_state			: 'NotOnePage',
				prevent_bubble 		: true,
			},
		},
		/*
		 * exit states...
		 */
		PageReady		:
		{
			OP_is_page_ready :
			{
				propagate_event		: 'OP_new_page_ready',
			},
		},
		PageReadyAfterReinit	:
		{
			OP_is_page_ready :
			{
				propagate_event		: 'OP_page_reinitok',
			},
		},
		DefaultState	:
		{
			start	: 
			{
				next_state		: 'NotOnePage',
			},
			//neutralization of the default behaviour -> do nothing!
			Error_OnePageNotInitialized	:
			{
				prevent_bubble 		: true,
			},
		},
	};
	/*
	 * @param OnePageFunctionStates - states defition
	 */

	this.OnePageFunctionStates = {
		/*state list*/
			//to have a first ajax load
		WaitForInitialisation :
		{	
			enterState :
			{
				init_function		: _hideLoader,
			},
/*			OP_test_ifonepage	:
			{
				next_state		: 'NotOnePage',
				next_state_when	: "(this.opts.OnePageObject.getPageItems()!==false)", 
			},
*/
			OP_new_page_loaded	:
			{
				process_event_if	:  "( 	($(this.opts.OnePageObject.opts.OnePageContainer).length != 0) "
									 + "&& 	(this.opts.OnePageObject.getPageItems()!==false) )",
				next_state			: 'BecomeOnePage',
				propagate_event_on_refused : 'OP_scroll_up_normalpage',//we scroll up the page as nobody do it...
				propagate_event		: true,
			},
			OP_scroll_up_normalpage :
			{
				init_function		: function() {jQuery('html,body').stop().animate({scrollTop: 0});},

			}
		},			
		BecomeOnePage 			:
		{
			enterState :
			{
				propagate_event	: 'OP_show_loader',
			},
			delegate_machines :
			{
			'managing_BecomeOnePage' : 
				{
				submachine : ManageNotOnePageStates,
				},
			},
			OP_show_loader :
			{
				init_function	: _showLoader,
				how_process_event 	: {delay:0},//
				propagate_event	: 'OP_start_timeout_becomeonepage',
			},
			OP_new_page_ready :
			{
				next_state		: 'OnePageSet',
				propagate_event : 'OP_new_page_ready',
			},
			OP_page_reinitok :
			{
				next_state		: 'OnePageSet',
				propagate_event : true,
			},
			OP_start_timeout_becomeonepage :
			{
				how_process_event 	: {delay:30000},//
				propagate_event	: 'OP_display_error_timeout',
				out_function	: function(){$('.ajax-loader').append('<div style="margin:40px;color:red;font-weight:bold">Erreur Technique : Page non initialisée</div>');},
			},
			OP_display_error_timeout :
			{
				how_process_event 	: {delay:5000},//display the message for 5sec
				propagate_event	: 'Error_OnePageNotInitialized_NotOnePage',
			},
			Error_OnePageNotInitialized_NotOnePage :
			{
				next_state		: 'WaitForInitialisation',//pas un one page... on peut considérer qu'on est bon...
			}
		},
		OnePageSet 			:
		{
			enterState			:
			{
				//propagate_event		: 'launch_AutomaticVerification',
				init_function		: _hideLoader,
				//out_function		: function(){$(document).trigger('OnePageReady')}// could be a event to trigger to others...?
			},
			OP_new_page_ready	:
			{
				init_function		: function(param,event,data){
										this.trigger('OP_PageToGo', this.opts.OnePageObject.searchPageIdFromURL());
										},
			},
			delegate_machines :
				{
				'managing_scrolls' : 
					{
					submachine : ManageScrollStates,
					},
				'managing_stickyanimation' : 
					{
					submachine : ManageStickyAnimation,
					},
				'managing_reinit' : 
					{
					submachine : ManagePageChange,
					},
				},
			OP_reinit_onepage_fromstart :
			{
				next_state:'BecomeOnePage',
				propagate_event : 'OP_new_page_loaded',
			},
			OP_reinit_onepage :
			{
				next_state:'BecomeOnePage',
				propagate_event : true,
			},
			launch_AutomaticVerification	:
			{
/*				propagate_event : 'AutomaticVerification',
				how_process_event : {delay:2000},
*/
			},
			//a new page and content is loading...
			OP_wait_for_new_page :
				{
					next_state:'WaitForInitialisation',
				},	
			Error_OnePageNotInitialized_Other	:
			{
				propagate_event	: 'OP_reinit_onepage',
				how_process_event : {delay:500},
				next_state	: 'BecomeOnePage',
				next_state_when : '(this.opts.nbTryInitializeOP<=20)',//stop to try if too much tries
				init_function : function() 
								{
									if (this.opts.nbTryInitializeOP) this.opts.nbTryInitializeOP = this.opts.nbTryInitializeOP + 1;
									else this.opts.nbTryInitializeOP = 1;
								},
				out_function : 	function() 
								{
									if (this.opts.nbTryInitializeOP>20) 
									{
										this.trigger('OP_stop_try');
										this.opts.nbTryInitializeOP = 0;
									};
								}
			},
			OP_stop_try :
			{
				next_state : 'WaitForInitialisation',
			},
			Error_OnePageNotInitialized_PageItemsVoid	:
			{
				next_state	: 'WaitForInitialisation',
			},
		},
		DefaultState :
		{
			start	:
			{
				next_state : 'WaitForInitialisation',
			},
			AutomaticVerification	://if any change in the page was not managed //not launched for now
			{
				how_process_event 	: {delay:1000},
				process_event_if	: "this.opts.OnePageObject.quickTestIfReady() == false", 
				propagate_event 	: 'OP_ReinitOnePage',
				propagate_event_on_refused : 'AutomaticVerification',
			},

			Error_OnePageNotInitialized	:
			{
				init_function : function(p,e,errortype) {
					if (!errortype) errortype='_Other';
					else errortype='_'+errortype;
					this.myUIObject.trigger('Error_OnePageNotInitialized'+errortype);
					this._log('Error_OnePageNotInitialized'+errortype,1);
				},
			},
			
		}
	}//OnePageFunctionStates

	/*
	 * _sendEventToOnePage - send a message to onePage
	 */
	var _sendEventToOnePage = function(param,event,data)
	{
		this._log('_sendEventToOnePage ');
		if (data && data.targetFSM) data['targetFSM']=null;
		$(this.opts.DelegateTo).trigger(param,data);

	}

	this.WindowEvent = {
			DefaultState :
			{
				resize	:
				{
					how_process_event 	: {delay:50},//tampon avant de travailler
					UI_event_bubble	: true,
					out_function	: function() {this.trigger('preparePageChange');},
				},
				preparePageChange :
				{
					how_process_event 	: {delay:500},//on attend que ça se stabilise...
					init_function : _sendEventToOnePage,
					properties_init_function : 'OP_OnePageChange',
				},
	
			}
		};//WindowEvent


	/*
	 * MouseWheel management for smooth 
	 */
	/*
	 * Smooth Mousewheel initialization 
	 */
	var StartMouseWheelOn_Smooth_init = function()
	{
		this.opts.mousewheel_SubMachine = {};
		var varenv = this.opts.mousewheel_SubMachine;
		varenv['self'] = {
	        step:115 ,
	        speed: 400,
	        ease: "swing",
	        stopPropagation : true,
		};
	    // private fields & init
		varenv.top = 0,
		varenv.step = varenv.self.step,
		varenv.speed = varenv.self.speed,
		varenv.viewport = $(window).height(),
		varenv.wheel = false;
	};
	
	/*
	 * Smooth mousewheel scroll move
	 */
	var StartMouseWheelOn_Smooth_move = function(param,event,delta) 
	{
		var varenv = this.opts.mousewheel_SubMachine;
		varenv.wheel = true;

        if (delta < 0) // down
        	varenv.top = (varenv.top+varenv.viewport) >= $(document).height() ? varenv.top : varenv.top+=varenv.step;

        else // up
        	varenv.top = varenv.top <= 0 ? 0 : varenv.top-=varenv.step;

        $('body,html').stop(true,true).animate({scrollTop: varenv.top}, varenv.speed, varenv.self.ease, function () {
        	varenv.wheel = false;
        });					
	};
	/*
	 *  Smooth mousewheel - set variables if resize
	 */
	var StartMouseWheelOn_Smooth_resizeset = function(){varenv.viewport = $(window).height();}
	
	/*
	 *  Smooth mousewheel - set variables if resize
	 */
	var StartMouseWheelOn_Smooth_scrollset = function()
	{
		var varenv = this.opts.mousewheel_SubMachine;
		if (!varenv.wheel)
			varenv.top = $(window).scrollTop();
	};
	
	var mousewheel_SubMachine = 
	{
		InitMouseWheel :
		{
			test_ifsmooth :
			{
				next_state 		: 'StartMouseWheelOn_Smooth',
				next_state_when : (this.opts.navigator_list_for_smooth[_navigator_sayswho().split(" ")[0].toLowerCase()] != undefined),
				propagate_event : 'start_listening',
				prevent_bubble 		: true,
			},
			start_listening : 
			{
				next_state : 'MouseWheelOn_Normal',
				prevent_bubble 		: true,
			}
			
		},
		StartMouseWheelOn_Smooth :
		{	
			start_listening : 
			{
				init_function : StartMouseWheelOn_Smooth_init,
				next_state : 'MouseWheelOn_Smooth',
				prevent_bubble 		: true,
			}
		},
		MouseWheelOn_Smooth :
		{
			mousewheel	:
			{
				init_function : StartMouseWheelOn_Smooth_move,
				UI_event_bubble	: false,
			},
			stop_listening_mousewheel :
			{
				next_state : 'MouseWheelOff_Smooth',
				prevent_bubble 		: true,
			},
			resize : 
			{
					init_function: StartMouseWheelOn_Smooth_resizeset,
					UI_event_bubble	: true,
			},
			scroll :
			{
				init_function: StartMouseWheelOn_Smooth_scrollset,
				UI_event_bubble	: true,
			},
		},
		MouseWheelOff_Smooth :
		{
			enterState :
			{
				init_function: StartMouseWheelOn_Smooth_scrollset,
				propagate_event : 'restartListeningMouseWheel',
			},
			restartListeningMouseWheel :
			{
				next_state : 'MouseWheelOn_Smooth',
				how_process_event 	: {delay:1200},
				prevent_bubble 		: true,
			},
			mousewheel	://stop mousewheel scrolling
			{
				UI_event_bubble	: false,
			},
			start_listening_mousewheel ://if we'd like to restart listening before the delay
			{
				next_state : 'MouseWheelOn_Smooth',
				prevent_bubble 		: true,
			},
			scroll :
			{
				//init_function: StartMouseWheelOn_Smooth_scrollset,
				UI_event_bubble	: true,
			},
			resize : 
			{
				init_function: StartMouseWheelOn_Smooth_resizeset,
				UI_event_bubble	: true,
			},
			exitState :
			{
				init_function: StartMouseWheelOn_Smooth_scrollset,
			},
		},
		MouseWheelOn_Normal:
		{
			mousewheel	://stop mousewheel scrolling
			{
				UI_event_bubble	: true,
			},
			stop_listening_mousewheel :
			{
				next_state : 'MouseWheelOff_Normal',
				prevent_bubble 		: true,
			},
		},
		MouseWheelOff_Normal:
		{
			enterState :
			{
				propagate_event : 'restartListeningMouseWheel',
			},
			restartListeningMouseWheel :
			{
				next_state : 'MouseWheelOn_Normal',
				how_process_event 	: {delay:1200},
				prevent_bubble 		: true,
			},
			mousewheel	://stop mousewheel scrolling
			{
				UI_event_bubble	: false,
			},
			start_listening_mousewheel ://if we'd like to restart listening before the delay
			{
				next_state : 'MouseWheelOn_Normal',
				prevent_bubble 		: true,
			},
		},
		DefaultState :
		{
			start : 
			{
				next_state:'InitMouseWheel',
				propagate_event : 'test_ifsmooth',
			},
		}
	}

	this.DocumentEvent = {
			DocumentActive :
			{
				delegate_machines :
				{
					'mousewheel_SubMachine' : 
					{
						submachine : mousewheel_SubMachine,
					},
				},
				mousewheel	:
				{
					init_function : _sendEventToOnePage,
					properties_init_function : 'OP_set_mousewheel',
					UI_event_bubble	: true,//if someone set it to false... this sentence would not change that... 
				},
			},
			DefaultState :
			{
				'start' :
				{
					next_state : 'DocumentActive'
				},
				'ajax-success-call'	:
				{
					init_function : _sendEventToOnePage,
					properties_init_function : 'OP_new_page_loaded'
				},
				'ajax-before-call' :
				{
					init_function : _sendEventToOnePage,
					properties_init_function : 'OP_wait_for_new_page'
				},
				scroll	:
				{
					init_function : _sendEventToOnePage,
					properties_init_function : 'OP_move_scroll',
					UI_event_bubble	: true,
				},
				//event to send when something change in the page
				content_change : 
				{
					how_process_event 	: {delay:0},
					init_function : _sendEventToOnePage,
					properties_init_function : 'OP_OnePageChange',
				},
			},
		}//DocumentEvent
	
	
	return this;
}// end of OnePageDisplay object definition


/*
 * init - methode publique d'initialisation du OnePage
 */
OnePageDisplay.prototype.init = function ()
{
	this.log('init');
	// initialisation des evenements
	this.initEvents();
}

/*
 * initEvents - methode permettant l'initialisation des événements pris en compte
 */
OnePageDisplay.prototype.initEvents = function ()
{
	var aFSMx;
	this.log('initEvents');

	var CurrentOnePageObject = this;//nécessaire pour pas qu'il se perde dans les limbes après...
	aFSMx = new fsm_manager($(this.opts.GeneralContainer),this.OnePageFunctionStates,{OnePageObject:CurrentOnePageObject}); 
	aFSMx.InitManager();

	//get the onepage menu handlers set
	aFSMx = new fsm_manager($(window),this.WindowEvent,{DelegateTo:this.opts.GeneralContainer,OnePageObject:CurrentOnePageObject});
	aFSMx.InitManager();	
	aFSMx = new fsm_manager($(document),this.DocumentEvent,{DelegateTo:this.opts.GeneralContainer,OnePageObject:CurrentOnePageObject});
	aFSMx.InitManager();
}

/*
 * log - petite fonction de log pour activer le debug
 * @param message - message to log
 * @param error_level (default : 3)
 * 			- 1 : it's an error
 * 			- 2 : it's a warning
 * 			- 3 : it's a notice
 *
 */
OnePageDisplay.prototype.log = function (message) {
	/*global console:true */

	if ( (arguments.length > 1) && (arguments[1] > this.opts.LogLevel) ) return; //on ne continue que si le nv de message est <= ? LogLevel
	else if ( (arguments.length <= 1) && (3 > this.opts.LogLevel) ) return;// pas de niveau de msg d?fini => niveau notice (3)

	if (window.console && console.log && this.opts.debug)
	{
		console.log('[onepageDisplay] ' + message);
		if ( (arguments[1] == 1) && this.opts.AlertError) alert(message);
	}
};//end of

/*
 * initializeOnePage - initialise a new OnePage
 */
OnePageDisplay.prototype.initializeOnePage = function ()
{
	this.log('initializeOnePage');
	
	//first initialize the general variables of the onepage
	if ( !this.initVariables() )
	{
		//c'est pas très bon ça! on n'arrive pas à initialiser...
		this.log('On arrive pas à initialiser :-( est-ce vraiment une page onePage?',1);
		$(this.opts.GeneralContainer).trigger( 'Error_OnePageNotInitialized', 'NotOnePage' );
		return false;
	}

	// if ok we can install our one page values on the items
	return this.setOnePageValues();

}

/*
 * initVariables - initialisation variables of a OnePage
 * 					to do when a new page is loaded
 * @return
 * 	- true if all variables could be set
 *  - false if any problem in setting the variables
 *
 *
 */
OnePageDisplay.prototype.initVariables = function ()
{
	this.log('initVariables');

	//get all the page items of the onepage
	if (this.getPageItems() === false) 
	{
		this.log('initVariables OnePageItems null: '+this.opts.OnePageItems,1);
		return false;
	}
	
	this.WindowHeight	= jQuery(window).height();
	
	if ($(this.opts.OnePageContainer).length == 0)
	{
		this.log('initVariables OnePageContainer null: '+this.opts.OnePageContainer,1);
		return false;
	}
	
	this.topContainer	= $(this.opts.OnePageContainer).offset().top;

	if ( $(this.opts.OnePageItems).filter('['+this.opts.PageIdAttributeOnItem+']' ).length == 0 )
	{
		this.log('initVariables PageIdAttributeOnItem null on items: '+this.opts.PageIdAttributeOnItem,1);
		return false;
	}

	this.log('initVariables topContainer: '+this.topContainer);

	return true;
}

/*
 * setOnePageValues - set the different values (height, sticky, ...) on the different one page items
 *
 */
OnePageDisplay.prototype.setOnePageValues = function ()
{
	this.log('setOnePageValues');

	//we store the height current value of each item
	//this way we could say if a height of an item changed or not
	this.setHeightValue();

	//we store the position of each item as the position may change due to the sticky
	this.setScrollValueToPageItem();

	//we set the sticky on the page items
	this.setSticky();
	
	return true;

}//end of setOnePageValues

/*
 * setHeightValue - initialise the height values of the items
 * @return boolean
 *  - true if ok
 *  - false if error
 *
 */
OnePageDisplay.prototype.setHeightValue = function () {
	this.log('setHeightValue');

	this.WindowHeight	= $(window).height();
	var DocumentHeight  = this.DocumentHeight  = 0;

	var thisOP = this;
	var currentHeight= 0;
	var previousHeight=500;
	
	this.myPageItems.each(function(){
		//prepare the detection windows for each page
		currentHeight=$(this).outerHeight();
		previousHeight = currentHeight;
		
		DocumentHeight = DocumentHeight +  currentHeight;
		$(this).attr('data-height-value', currentHeight);
	});
	this.DocumentHeight = DocumentHeight;
	return true;
}//end of

/*
 * setScrollValueToPageItem - initialise les valeurs de scroll de chacun des articles
 * @return boolean
 *  - true if ok
 *  - false if error
 */
OnePageDisplay.prototype.setScrollValueToPageItem = function () {
	this.log('setScrollValueToPageItem');

	//general height start after banner
	var previousHeight = this.topContainer;
	var currentz = 0;
	var zvalue 	= 0;
	var zincrement = 10;
	var PageIdAttributeOnItem = this.opts.PageIdAttributeOnItem;
	var thisOP	= this;

	//setting the scroll value to each onepage item
	this.myPageItems.each(function(){
		//init data-scroll-value on each page item
		$(this).attr('data-scroll-value', previousHeight);
		previousHeight = previousHeight + $(this).outerHeight();
		
		//increase each z-index as to have first page -> first layer and last page -> last layer
		currentz = parseInt($(this).css('z-index'));
		if (isNaN(currentz)) currentz=0;
		zvalue = zvalue + zincrement + currentz;
		thisOP.log('setScrollValueToPageItem: zvalue: '+zvalue);
		$(this).css('z-index',zvalue);
		thisOP.log('setScrollValueToPageItem: name - z-index: '+$(this).attr(PageIdAttributeOnItem)+'-'+$(this).css('z-index'));

	});
	return true;
}//end of

/*
 * setSticky - met en place la pagination en mode "stiky"
 *
 */
OnePageDisplay.prototype.setSticky  = function () {

	this.log('setSticky');

	this.log('setSticky: topContainer: '+this.topContainer);

	var currentPosition = 0;
	var newId=0; var $hArt=0; var deltaUpScroll = 0;

	var thisOP	= this;
	var PageIdAttributeOnItem 	= this.opts.PageIdAttributeOnItem;
	var WindowHeight 			= this.WindowHeight;
	var topContainer			= this.topContainer;

	this.myPageItems.each(function(){
		//if item page has no id, we set one (needed for sticky)
		if ($(this).attr('id') == null)
		{
			newId = $(this).attr(PageIdAttributeOnItem);
			$(this).attr('id',newId);
		}

		$hArt = $(this).outerHeight();
		deltaUpScroll = 0;

		thisOP.log('setSticky: currentPosition - topContainer '+currentPosition +'-'+ topContainer);
		//we look if we need to stick the page above its top
		if ( $hArt > WindowHeight-topContainer ) deltaUpScroll=$hArt - (WindowHeight-topContainer);
		jQuery(this).sticky({topSpacing: topContainer - deltaUpScroll});

	});
	return true;
}//end of


/*
 * getPageItems - get the DOM one page Items
 * @return mixed 
 * 		jQuery Object if exists
 * 		boolean false if not
 *
 */
OnePageDisplay.prototype.getPageItems = function () {
	this.log('getPageItems');

	this.myPageItems 	= $(this.opts.OnePageItems);
	if (!this.myPageItems || this.myPageItems.length == 0) return false;
	return this.myPageItems;
}//end of


/*
 * testPageSelectable - detects if the page is considered to be visible and so selected
 * @param {object} 	aPageObject 		- a jquery object, a "one page" to test
 * @param integer 	aScrollPosition 	- the reference position to test (for instance : jQuery(document).scrollTop())
 * @param integer 	DetectionType		-
 * 		if == -1, detect the page top between  opts.MW_MinHeightDetect and  opts.MW_MaxHeightDetect
 * 		if == 1, detect  the page top between -opts.MW_MaxHeightDetect and -opts.MW_MinHeightDetect
 * 		if == 0, detect  the page top between -opts.MW_MaxHeightDetect and  opts.MW_MaxHeightDetect
 * 		if == 2, detect if the page is between - $(aPageObject).outerHeight()+opts.MW_MinHeightDetect and + opts.MW_MaxHeightDetect
 */
OnePageDisplay.prototype.testPageSelectable = function(aPageObject, aScrollPosition, DetectionType)
{
	this.log('testPageSelectable');

	// get the position of the page object repositioned according to the topContainer offset
	var currentOffset = aPageObject.attr('data-scroll-value') - this.topContainer;
	var PageId = aPageObject.attr('data-pageid');
	var windowHeight = $(window).height()*.4;
	this.log('testPageSelectable - DetectionType - currentOffset - scrollPosition:'+DetectionType+'-'+currentOffset+'-'+aScrollPosition);

	//this.log('testPageSelectable - aScrollPosition + opts.MW_MinHeightDetect:'+aScrollPosition+'+'+this.opts.MW_MinHeightDetect);
	//this.log('testPageSelectable - aScrollPosition + opts.MW_MaxHeightDetect:'+aScrollPosition+'+'+this.opts.MW_MaxHeightDetect);

	/* la page est considérée comme visible et en cours par l'utilisateur
	 * si le haut de la page est entre - opts.MW_MaxHeightDetect et opts.MW_MaxHeightDetect
	 *
	*/
	if (
			 (	   ( DetectionType == -1 )
				&& ( ( aScrollPosition + this.opts.MW_MinHeightDetect ) <= currentOffset )
				&& ( 				currentOffset 				   <= (  aScrollPosition + this.opts.MW_MaxHeightDetect ) )
			 )
				||
			 (	   ( DetectionType == 1 )
				&& ( ( aScrollPosition - this.opts.MW_MaxHeightDetect ) <= currentOffset )
				&& ( 					currentOffset 			   <= ( aScrollPosition - this.opts.MW_MinHeightDetect ) )
			 )
				||
			(	   ( DetectionType == 0 )
				&& ( ( aScrollPosition - this.opts.MW_MaxHeightDetect ) <= currentOffset )
				&& ( 					currentOffset 			   <= ( aScrollPosition + this.opts.MW_MaxHeightDetect ) )
			 )
			 	||
			(	   ( DetectionType == 2 )
					&& ( ( currentOffset  - windowHeight ) <= aScrollPosition )
					&& ( 					aScrollPosition 			   <= ( currentOffset + parseInt(aPageObject.attr('data-height-value')) -  windowHeight) ) 
			)
	    )
	{
		this.log('testPageSelectable Detected ');
		return true;
	}
	else
	{
		this.log('testPageSelectable not Detected ');
		return false;
	}
}//end of

/*
 * scrollToPage - Scrolling to a pageid
 * state function
 * @param aPageId 	- a ressource page Id the onepage should be placed on
 */
OnePageDisplay.prototype.scrollToPage = function(aPageId)
{
	this.log('scrollToPage: aPageId: '+aPageId);

	//we get the page item from its matching id sets with PrefixPageIdOnItem attribute
	var aPageToGo 		= $( this.opts.OnePageItems).filter('['+this.opts.PageIdAttributeOnItem+'='+this.opts.PrefixPageIdOnItem+aPageId+']');
	var AnimationDelta 	= 0;

	if ( aPageToGo.length == 0 )
	{
		this.log('scrollToPage: aPageToGo is null... '+aPageId,2);

		//somehow it is perhaps a first level menu...? let's try to get the first menu of second level...
		aPageId = $('#'+this.opts.PrefixPageIdOnItem+aPageId+' > ul > li > a').attr(this.opts.OnePageIdMenus);

		aPageToGo 		= $( this.opts.OnePageItems).filter('['+this.opts.PageIdAttributeOnItem+'='+this.opts.PrefixPageIdOnItem+aPageId+']');
		if ( aPageToGo.length == 0 ) //well no way to find a one page...?
		{
			this.log('scrollToPage: aPageToGo is really null... no second level menu '+aPageId,2);
			return false;
		}
	}

	this.currentPageId = aPageId;
	AnimationDelta = aPageToGo.attr('data-scroll-value') - this.topContainer;
	//animation should always be done on DOM objects (not on document for instance!)
	jQuery('html,body').stop(true,true).animate({scrollTop: AnimationDelta});

	this.log('scrollToPage: AnimationDelta: '+AnimationDelta);
	
	return true;
};//end of

/*
 * quickTestIfReady - verify if the one page is ready with first simple test
 * @return 	true if ready to do the onepage features
 * 			false if not ready
 */
OnePageDisplay.prototype.quickTestIfReady = function () 
{
	var test = true;
	this.log('quickTestIfReady');

	if (this.getPageItems() === false) 
	{
		this.log('quickTestIfReady: void element '+this.opts.OnePageItems,2);
		return false;
	}
	
	var thisOP = this;
	this.myPageItems.each(function(){
		if ($(this).attr('data-height-value') != $(this).outerHeight())
		{
			thisOP.log('quickTestIfReady: data-height-value nul '+$(this).attr('id'),2);
			test = false;
			return false; //break each
		}
		if ($(this).parent().css('height') != $(this).attr('data-height-value')+'px')
		{
			thisOP.log('testIfReady: height of sticky not correct'+$(this).attr('id'),2);
			test= false;
			return false; //break each
		}
	});//end each
	
	return test;
}
/*
 * testIfReady - verify if the one page is ready
 * @return 	true if ready to do the onepage features
 * 			false if not ready
 */
OnePageDisplay.prototype.testIfReady = function () {
	var test = true;
	var notready='';
	
	this.log('testIfReady');

	if (this.getPageItems() === false) 
	{
		this.log('testIfReady: void element '+this.opts.OnePageItems,2);
		test = false;
	}

	if ($.isNumeric(this.WindowHeight) == false)
	{
		this.log('testIfReady: WindowHeight nul ',2);
		test = false;
	}
	if ($.isNumeric(this.topContainer) == false)
	{
		this.log('testIfReady: topContainer nul ',2);
		test = false;
	}

	var thisOP = this;
	var PageIdAttributeOnItem = this.opts.PageIdAttributeOnItem;
	if (test) this.myPageItems.each(function(){
		if ($(this).attr(PageIdAttributeOnItem) == null)
		{
			thisOP.log('testIfReady: '+PageIdAttributeOnItem+' nul '+$(this).attr('id'),2);
			test= false;
			return false; //break each
		}
		if ($(this).attr('data-scroll-value') == null)
		{
			thisOP.log('testIfReady: data-scroll-value nul '+$(this).attr('id'),2);
			test= false;
			return false; //break each
		}
		if ($(this).attr('data-height-value') != $(this).outerHeight())
		{
			thisOP.log('testIfReady: data-height-value nul '+$(this).attr('id'),2);
			test= false;
			return false; //break each
		}
		if ($(this).parent().attr('id') != $(this).attr('id')+'-sticky-wrapper')
		{
			thisOP.log('testIfReady: sticky not ready '+$(this).attr('id'),2);
			test= false;
			return false; //break each
		}
		if ($(this).parent().css('height') != $(this).attr('data-height-value')+'px')
		{
			thisOP.log('testIfReady: height of sticky not correct'+$(this).attr('id'),2);
			test= false;
			return false; //break each
		}

	});

	if (!test)
	{
		notready='not ';
		$(this.opts.GeneralContainer).trigger( 'Error_OnePageNotInitialized' );
	}
	this.log('testIfReady : Page is '+notready+'ready',test?3:2);
	return test;

}//end of

/*
 * whoHasToBeSticked - send back item page that should be sticked
 * @param delta : +1: if page went down, -1 if page went up
 * @return a jQuery Object - page item. null if not found
 */
OnePageDisplay.prototype.whoHasToBeSticked = function (delta)
{
	this.log('whoHasToBeSticked (delta)'+delta);

	var currentScrollTop 	= jQuery(document).scrollTop();
	var thisOP				= this;
	
	var foundPage			= null;
	
	jQuery(this.opts.OnePageItems).each(function(){
		if (thisOP.testPageSelectable($(this),currentScrollTop, delta))
		{
			foundPage = $(this);
			return false;//break the loop as page found
		}
	});
	return foundPage;
};//end of
/*
 * animateStickyPage - Animate the page if near top of its sticky position
 * @param aPageItem : a page item to animate for sticky
 * @return true if everything runs ok
 */
OnePageDisplay.prototype.animateStickyPage = function (aPageItem)
{
	this.log('animateStickyPage');

	
	var currentScrollTop 	= jQuery(document).scrollTop();
	var topContainer		= this.topContainer;
	var currentOffset 		= aPageItem.attr('data-scroll-value') - topContainer;
	var GeneralContainer	= this.opts.GeneralContainer;
	
	if (Math.abs(currentOffset - jQuery(document).scrollTop()) < this.opts.MW_MinHeightDetect) return false;

	
	this.log('animateStickyPage- currentOffset ok:'+currentOffset);
	
	//animation should always be done on DOM objects (not on document for instance!)
	jQuery('html,body').stop(true,true).animate({scrollTop: currentOffset},{
		easing: 'easeOutBack',
		duration: 1000,
		complete : function() {
			$(GeneralContainer).trigger('OP_animation_finished');
			}
	});
	return true;
};//end of

