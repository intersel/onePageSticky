// Sticky Plugin v1.0.0 for jQuery
// =============
// Author: Anthony Garand
// Improvements by German M. Bravo (Kronuz) and Ruud Kamphuis (ruudk)
// Improvements by Leonardo C. Daronco (daronco)
// Created: 2/14/2011
// Date: 2/12/2012
// Website: http://labs.anthonygarand.com/sticky
// Description: Makes an element on the page stick on the screen as you scroll
//       It will only set the 'top' and 'position' of your element, you
//       might need to adjust the width in some cases.
/*
 * Evolutions :
 * 	- 2013/10/17 - E.Podvin - StickyPlus...
 */


(function($) {
  var defaults = {
      topSpacing: 0,
      bottomSpacing: 0,
      className: 'is-sticky',
      wrapperClassName: 'sticky-wrapper',
      center: false,
      getWidthFrom: ''
    },
    $window = $(window),
    $document = $(document),
    sticked = [],
    windowHeight = $window.height(),
    scroller = function() {
      var scrollTop = $window.scrollTop(),
        documentHeight = $document.height(),
        dwh = documentHeight - windowHeight,
        extra = (scrollTop > dwh) ? dwh - scrollTop : 0;

      for (var i = 0; i < sticked.length; i++) 
      {
        var s = sticked[i],
          elementTop = s.stickyWrapper.offset().top,
          etse = elementTop - s.topSpacing - extra;

        if (scrollTop <= etse) 
        {
          if (s.currentTop !== null) 
          {
            s.stickyElement
              .css('position', '')
              .css('top', '');
            s.stickyElement.parent().removeClass(s.className);
            s.currentTop = null;
          }
        }
        else 
        {
          var newTop = documentHeight - s.stickyElement.outerHeight()
            - s.topSpacing - s.bottomSpacing - scrollTop - extra;
          if (newTop < 0) 
          {
            newTop = newTop + s.topSpacing;
          } 
          else 
          {
            newTop = s.topSpacing;
          }
          if (s.currentTop != newTop) 
          {
            s.stickyElement
              .css('position', 'fixed')
              .css('top', newTop);

            if (s.getWidthFrom != '' && typeof s.getWidthFrom !== 'undefined') 
            {
              s.stickyElement.css('width', $(s.getWidthFrom).width());
            }

            s.stickyElement.parent().addClass(s.className);
            s.currentTop = newTop;
          }
        }
      }//end for
    },
    resizer = function() {
      windowHeight = $window.height();
    },
    update_stickyelement = function(aStickyElementId, atopSpacing)
    {
        for (var i = 0; i < sticked.length; i++) {
            if (sticked[i].stickyElement.attr('id') == aStickyElementId) 
            {
            	sticked[i].topSpacing = atopSpacing;
            	sticked[i].stickyWrapper.css('height', sticked[i].stickyElement.outerHeight());
            	/*
            	if (window.console && console.log)
        			console.log('[stickyplus] update_stickyelement ' +sticked[i].stickyElement.attr('id')+':'+ sticked[i].stickyWrapper.css('height')+'==?'+sticked[i].stickyElement.attr('data-height-value'));
        		*/
            	//return; //mis en commentaire car il y a des cas où il y aurait plusieurs instances en fait... il faudrait creuser pour voir à nettoyer ça
            }
        }

    },
    methods = {
      init: function(options) {
        var o = $.extend(defaults, options);
        return this.each(function() {
          var stickyElement = $(this);

          var stickyId = stickyElement.attr('id');
          
          if (stickyElement.parent().attr('id') == stickyId + '-sticky-wrapper')
    	  {
        	  update_stickyelement(stickyId, o.topSpacing);
    	  }
          else
    	  {        	  
            var wrapper = $('<div></div>')
              .attr('id', stickyId + '-sticky-wrapper')
              .addClass(o.wrapperClassName);
            stickyElement.wrapAll(wrapper);

            if (o.center) {
              stickyElement.parent().css({width:stickyElement.outerWidth(),marginLeft:"auto",marginRight:"auto"});
            }

            if (stickyElement.css("float") == "right") {
              stickyElement.css({"float":"none"}).parent().css({"float":"right"});
            }

            var stickyWrapper = stickyElement.parent();
            stickyWrapper.css('height', stickyElement.outerHeight());
            sticked.push({
              topSpacing: o.topSpacing,
              bottomSpacing: o.bottomSpacing,
              stickyElement: stickyElement,
              currentTop: null,
              stickyWrapper: stickyWrapper,
              className: o.className,
              getWidthFrom: o.getWidthFrom
            });
    	  }
          
        });//end each
      },
      update: scroller
    };

  // should be more efficient than using $window.scroll(scroller) and $window.resize(resizer):
  if (window.addEventListener) {
    window.addEventListener('scroll', scroller, false);
    window.addEventListener('resize', resizer, false);
  } else if (window.attachEvent) {
    window.attachEvent('onscroll', scroller);
    window.attachEvent('onresize', resizer);
  }

  $.fn.sticky = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method ) {
      return methods.init.apply( this, arguments );
    } else {
      $.error('Method ' + method + ' does not exist on jQuery.sticky');
    }
  };
  $(function() {
    setTimeout(scroller, 0);
  });
})(jQuery);
