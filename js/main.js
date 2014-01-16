
/* Responsive HTML5 gallery tutorial
 *
 * http://tomicloud.com/2014/01/responsive-gallery
 * https://github.com/tomimick/responsive-image-gallery */

$(function() {
    var menu = $("#menu");
    var main = $("#main");
    var top = $("#top");
    var about = $("#about");
    var images = $("#images");
    var favorites = $("#favorites");
    var carousel = $("#carousel");
    var topsearch = $("#topsearch");
    var carousel_obj = new Carousel("#carousel");
    var is_favorites_active = false;
    var api_flickr = "http://api.flickr.com/services/feeds/photos_public.gne?jsoncallback=?";


    // remove 300ms click delay in mobile browsers
    FastClick.attach(document.body);

    // associate all click handlers
    set_click_handlers();

    // clone menu hierarchy for large screen
    $("#top").append(menu.find("ul").clone());

    // url hash has changed
    $(window).on('hashchange', function () {
        route_url();
    });

    // load images from flickr
    fetch_images();

    // route to main page
    route_url();

    // resize handler
    $(window).on('resize orientationchange', function(){
        resize_images();
    });



// based on url hash, adjust layout
function route_url() {
    var hash = window.location.hash;
    var fade_carousel = true;
    is_favorites_active = false;

    // select active menu item
    $("ul.menu").find("a").removeClass("active");
    var active = $("ul.menu").find("[href='"+(hash?hash:"#")+"']");
    active.addClass("active");
    top.find("h1 a").text(active.eq(0).text());

    if (!hash) {
        // home
        images.show();
        about.hide();
        favorites.hide();
        resize_images();
    } else if (hash == "#about") {
        // about
        images.hide();
        about.show();
        favorites.hide();
        $("#topsearch, #main").removeClass("opensearch");
    } else if (hash == "#favorites") {
        // favorites
        is_favorites_active = true;
        images.hide();
        about.hide();
        favorites.show();
        $("#topsearch, #main").removeClass("opensearch");
        fill_favorites();
        resize_images();
    } else if (hash.slice(0,5) == "#view") {
        // view image at index
        var i = parseInt(hash.slice(6));
        var div = images.find(">div").eq(i);
        show_carousel(div);
        about.hide();
        favorites.hide();
        fade_carousel = false;
    }

    if (fade_carousel && carousel.hasClass("anim2"))
        hide_carousel();
}


// resize images (width changed by CSS, height by this js)
function resize_images() {
    var cont = is_favorites_active ? favorites : images;
    var w = cont.find("div.my").eq(0).width();
    cont.find("div.my").height(w);
}

// sets all click handlers
function set_click_handlers() {

    // small screen: open/hide sliding menu
    $("#menubut, #menu a").click(function(){

        $("#main,#menu,#top,#topsearch").toggleClass("openmenu").removeClass("opensearch");

        if ($(this).attr("id") == "menubut")
            return false;
    });

    // reload all
    $("#reloadbut").click(function(){
        reload();
        // fall through to change tab
    });

    // open up search
    $("#searchbut").click(function(){
        $("#topsearch input").val("");

        if ($("#topsearch").toggleClass("opensearch").hasClass("opensearch"))
            setTimeout(function(){
                $("#topsearch input").focus();
            }, 500);

        main.toggleClass("opensearch");

        // fall through to change tab
    });


    // click on image
    $("#images, #favorites").on("click", "div", function(t) {
        var div = $(t.target);

        if (!div.is("div.my"))
            div = div.parents("div");
        if (!div.hasClass("my"))
            return;

        build_carousel(is_favorites_active ? favorites : images);

        if (div.hasClass("more"))
            load_more(div);
        else
            window.location.hash = "#view?" + div.index();
    });

    // click on image area closes menu
    main.on("click", function() {
        if (main.hasClass("openmenu")) {
            $("#menubut").click();
            return false;
        }
    });

    // enter in search activates search
    $("#searchinput").keyup(function(e) {
        if (e.keyCode == 13) {
            reload();
            return false;
        }
    });

    // escape always goes to home
    $(document.body).keyup(function(e) {
        if (e.keyCode == 27) {
            window.location.hash = "#";
        }
    });

    /* won't work in all browsers since hammer.js is active;
       see handle_tap()

    // click left/right
    $(".fa-arrow-circle-o-left").click(function(){
        carousel.prev();
        return false;
    });
    $(".fa-arrow-circle-o-right").click(function(){
        carousel.next();
        return false;
    });
    // add/remove a favorite
    carousel.on("click", "i.fa-star", function() {
        toggle_favorite($(this));
    });
    */


}

// toggle favorite-status while in carousel
function toggle_favorite(t) {
    t.toggleClass("favorited");

    var url = t.closest("li").find("img").attr("src");
    var title = t.closest("li").find("div").html();

    if (t.hasClass("favorited"))
        add_favorite(url, title);
    else
        remove_favorite(url);
}

// show carousel, position is at div
function show_carousel(div) {
    carousel_obj.init();
    carousel.hide().removeClass("anim1 anim2");

    // initial image index
    var i = div.index();
    carousel_obj.showPane(i, false);

    // show zoom anim
    carousel.addClass("anim1");
    carousel.show();
    carousel.width(); // flush
    carousel.addClass("anim2");

    $(window).scrollTop(0);
}

function hide_carousel() {
    carousel.removeClass("anim2");

    carousel.one("webkitTransitionEnd mozTransitionEnd transitionend", function(){
        // hide at end of transition
        carousel.hide();
    });
}

// discard and reload all images
function reload() {
    images.find("div").addClass("fadeaway");

    setTimeout(function() {
        images.empty();
        fetch_images();
    }, 1000);
}

// load more images
function load_more(div) {
    div.find("i").addClass("fa-refresh");

    div.addClass("start");

    // can't use this since other can fire it
//    div.one("webkitTransitionEnd mozTransitionEnd transitionend", function(){
    setTimeout(function() {
        images.find(".more").remove();
        fetch_images();
    }, 700);
}

// fetch images from Flickr
function fetch_images() {

    $.getJSON(api_flickr, {
        tags: $("#searchinput").val(),
        tagmode: "any",
        format: "json"
    })
    .done(function(data) {
        $.each(data.items, function(i, item) {
            var url = item.media.m;
            var title = item.title;
            var elem = $("<div class='my show'><img src='"+url+"'/><div>"+
                         title+"</div>");
            images.append(elem);
        });
        // add more-div and resize
        images.append($("#morediv").clone().removeAttr("id"));
        resize_images();
    });

}

// build carousel <ul> from images in home/favorites
function build_carousel(container) {

    var ul = carousel.find("ul");
    ul.empty();

    container.find("div.my img").each(function(i, elem) {
        var t = $(elem).clone();
        ul.append(t);
        ul.find("img:last").wrap("<li/>");
        var li = ul.find("li:last");
        li.append("<div>"+$(elem).parent().find("div").html()+"</div>");

        // favorited?
        var f = "";
        var url = t.attr("src");
        if (is_favorite(url))
            f = "favorited";

        /* XXX fix portrait pics...
        if (t.height() > t.width())
             t.addClass("portrait");
        */

        li.append("<i class='fa fa-3x fa-star "+f+"'></i>");
    });
}


// fill favorites div with data in localstorage
function fill_favorites() {
    var data = getdata();

    favorites.empty();

    if (!data.length) {
        favorites.append($("#favoempty").clone());
        return;
    }

    for (var i = 0; i < data.length; i++) {
        var obj = data[i];

        var elem = $("<div class='my show favorite'><img src='"+obj.url+"'/><div>"+
                     obj.title+"</div>");
        favorites.append(elem);
    }
}

function add_favorite(url, title) {
    var data = getdata();
    data.push({"title":title, "url":url});
    localStorage.setItem("imgdata", JSON.stringify(data));

    fill_favorites();
}

function remove_favorite(url) {
    var data = getdata();
    for (var i = 0; i < data.length; i++) {
        var obj = data[i];
        if (url == obj.url) {
            data.splice(i, 1);
            break;
        }
    }

    localStorage.setItem("imgdata", JSON.stringify(data));

    fill_favorites();
}

function is_favorite(url) {
    var data = getdata();
    for (var i = 0; i < data.length; i++) {
        var obj = data[i];
        if (url == obj.url)
            return true;
    }
}
// return array containing favorite objects
function getdata() {
    var data = localStorage.getItem("imgdata");
    if (!data)
        return [];
    return JSON.parse(data);
}


/*--------------------------------------------------------------------------*/
// carousel component from hammer.js demo


// handle taps of <i> in the carousel
function handle_tap(el) {
    if (!el.is("i"))
        window.history.back();
    else if (el.is(".fa-star"))
        toggle_favorite(el);
    else if (el.is(".fa-arrow-circle-o-left"))
        carousel_obj.prev();
    else if (el.is(".fa-arrow-circle-o-right"))
        carousel_obj.next();
}

/**
* super simple carousel
* animation between panes happens with css transitions
*/
function Carousel(element)
{
    var self = this;
    element = $(element);

    var container = $(">ul", element);
    var panes = $(">ul>li", element);

    var pane_width = 0;
    var pane_count = panes.length;

    var current_pane = 0;


    /**
     * initial
     */
    this.init = function() {
        panes = $(">ul>li", element);
        pane_count = panes.length;

        setPaneDimensions();

        $(window).on("load resize orientationchange", function() {
            setPaneDimensions();
            //updateOffset();
        });
    };


    /**
     * set the pane dimensions and scale the container
     */
    function setPaneDimensions() {
        pane_width = element.width();
        panes.each(function() {
            $(this).width(pane_width);
        });
        container.width(pane_width*pane_count);
    }

    /**
     * show pane by index
     */
    this.showPane = function(index, animate) {
        // between the bounds
        index = Math.max(0, Math.min(index, pane_count-1));
        current_pane = index;

        var offset = -((100/pane_count)*current_pane);
        setContainerOffset(offset, animate);
    };


    function setContainerOffset(percent, animate) {
        container.removeClass("animate");

        if(animate) {
            container.addClass("animate");
        }

        if(Modernizr.csstransforms3d) {
            container.css("transform", "translate3d("+ percent +"%,0,0) scale3d(1,1,1)");
        }
        else if(Modernizr.csstransforms) {
            container.css("transform", "translate("+ percent +"%,0)");
        }
        else {
            var px = ((pane_width*pane_count) / 100) * percent;
            container.css("left", px+"px");
        }
    }

    this.next = function() { return this.showPane(current_pane+1, true); };
    this.prev = function() { return this.showPane(current_pane-1, true); };

    function handleHammer(ev) {
        // disable browser scrolling
        if (ev.gesture)
            ev.gesture.preventDefault();

        switch(ev.type) {
            case 'dragright':
            case 'dragleft':
                // stick to the finger
                var pane_offset = -(100/pane_count)*current_pane;
                var drag_offset = ((100/pane_width)*ev.gesture.deltaX) / pane_count;

                // slow down at the first and last pane
                if((current_pane == 0 && ev.gesture.direction == "right") ||
                    (current_pane == pane_count-1 && ev.gesture.direction == "left")) {
                    drag_offset *= .4;
                }

                setContainerOffset(drag_offset + pane_offset);
                break;

            case 'swipeleft':
                self.next();
                ev.gesture.stopDetect();
                break;

            case 'swiperight':
                self.prev();
                ev.gesture.stopDetect();
                break;

            case 'tap':
                handle_tap($(ev.target));
                break;

            case 'release':
                // more then 50% moved, navigate
                if(Math.abs(ev.gesture.deltaX) > pane_width/2) {
                    if(ev.gesture.direction == 'right') {
                        self.prev();
                    } else {
                        self.next();
                    }
                }
                else {
                    self.showPane(current_pane, true);
                }
                break;
            default:
                break;
        }
    }

    var hammertime = new Hammer(element[0], { drag_lock_to_axis: true,
        drag_block_vertical: true});
    hammertime.on("release dragleft dragright swipeleft swiperight tap",
                  handleHammer);
}

});

