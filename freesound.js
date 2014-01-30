// Freesound API JavaScript Client
// API documentation: http://www.freesound.org/docs/api/

(function(name, definition) {
// CommonJS + AMD + Browser global
// http://stackoverflow.com/a/14033636/1729279
    if (typeof module != 'undefined')
        module.exports = definition();
    else if (typeof define == 'function' && typeof define.amd == 'object')
        define(name,[],definition);
    else
        this[name] = definition();
})('freesound', function() {

    var request;
    if (typeof module != 'undefined') {
        request = require("request");
    }

    var URIS = {
        SOUND : '/sounds/<sound_id>/',
        SOUND_ANALYSIS : '/sounds/<sound_id>/analysis/',
        SOUND_ANALYSIS_FILTER :'/sounds/<sound_id>/analysis/<filter>',
        SIMILAR_SOUNDS : '/sounds/<sound_id>/similar/',
        SEARCH : '/sounds/search/',
        CONTENT_SEARCH : '/sounds/content_search/',
        GEOTAG : '/sounds/geotag/',
        USER : '/people/<user_name>/',
        USER_SOUNDS : '/people/<user_name>/sounds/',
        USER_PACKS : '/people/<user_name>/packs/',
        USER_BOOKMARKS : '/people/<username>/bookmark_categories',
        BOOKMARK_CATEGORY_SOUNDS : '/people/<username>/bookmark_categories/<category_id>/sounds',
        PACK : '/packs/<pack_id>/',
        PACK_SOUNDS : '/packs/<pack_id>/sounds/',
    };

    var _make_uri  = function(uri,args){
        if (args) for (var i=args.length-1;i>=0;--i)
            uri = uri.replace(/<[\w_]+>/, args[i]);
        return freesound.BASE_URI+uri;
    };

    var _make_request  = function(uri,success,error,params,wrapper){
        if (freesound.debug) {
            console.log('[freesound] Running query...');
            console.log(params);
        }
        params.api_key = freesound.apiKey;
        if (request){ // node / commonJS
            request(uri, {
                json: true,
                qs: params
                }, function(e, r, data) {
                    if (!e && success)
                        success(wrapper?wrapper(data):data);
                    if (e && error)
                        error(e);
                }
            );
        }
        else{ // browser. No jQuery deps for now
            var xhr;
            try {xhr = new XMLHttpRequest();}
            catch (e) {xhr = new ActiveXObject('Microsoft.XMLHTTP');}
            xhr.onreadystatechange = function(){
                if (xhr.readyState == 4 && xhr.status == 200){
                    var data;
                    if (JSON && JSON.parse)
                        data = JSON.parse(xhr.responseText);
                    else
                        // Unsafe fallback for old browsers
                        data = eval("(" + xhr.responseText + ")");
                    if (success) success(wrapper?wrapper(data):data);
                }
                else if (xhr.readyState == 4 && xhr.status != 200){
                    if (error) error(xhr.statusText);
                }
            };
            // Encode URI
            if (uri.indexOf('?') == -1) {uri = uri+"?";}
            for(var p in params){uri = uri+"&"+p+"="+params[p];}
            // Request
            xhr.open('GET', uri);
            xhr.send(null);
        }
        delete params['api_key']; // Prevent apiKey from leaking out
    };

    var _make_sound_object = function(snd){ // receives json object already "parsed" (via eval)
        snd.get_analysis = function(showAll, filter, success, error){
            var params = {all: showAll?1:0};
            var base_uri = filter? URIS.SOUND_ANALYSIS_FILTER : URIS.SOUND_ANALYSIS;
            _make_request(_make_uri(base_uri,[snd.id,filter?filter:""]),success,error);
        };
        snd.get_similar_sounds = function(success, error){
            _make_request(
                _make_uri(URIS.SIMILAR_SOUNDS,[snd.id]),success,error,{},_make_collection_object);
        };
        snd.toJSON = function(){
            var result = {};
            for (var item in this) {
                result[item] = this[item];
            }
            delete result['get_analysis'];
            delete result['get_similar_sounds'];
            delete result['toJSON'];
            return result;
        };
        return snd;
    };

    var _make_collection_object = function(col){
        var get_next_or_prev = function(which,success,error){
            _make_request(which,success,error,{},_make_collection_object);
        };
        col.next_page = function(success,error){get_next_or_prev(this.next,success,error);};
        col.previous_page = function(success,error){get_next_or_prev(this.previous,success,error);};
        col.toJSON = function(){
            var result = {};
            for (var item in this) {
                result[item] = this[item];
            }
            delete result['next_page'];
            delete result['previous_page'];
            delete result['toJSON'];
            return result;
        };
        return col;
    };

    var _make_user_object = function(user){ // receives json object already "parsed" (via eval)
        user.get_sounds = function(success, error){
            _make_request(_make_uri(URIS.USER_SOUNDS,[user.username]),success,error,{},_make_collection_object);
        };
        user.get_packs = function(success, error){
            _make_request(_make_uri(URIS.USER_PACKS,[user.username]),success,error,{},_make_pack_collection_object);
        };
        user.get_bookmark_categories = function(success, error){
            _make_request(_make_uri(URIS.USER_BOOKMARKS,[user.username]),success,error);
        };
        user.get_bookmark_category_sounds = function(ref, success, error){
            _make_request(ref,success,error);
        };
        user.toJSON = function(){
            var result = {};
            for (var item in this) {
                result[item] = this[item];
            }
            delete result['get_sounds'];
            delete result['get_packs'];
            delete result['get_bookmark_categories'];
            delete result['get_bookmark_category_sounds'];
            delete result['toJSON'];
            return result;
        };
        return user;
    };

    var _make_pack_object = function(pack){ // receives json object already "parsed" (via eval)
        pack.get_sounds = function(success, error){
            _make_request(pack.sounds,success,error,{},_make_collection_object);
        };
        pack.toJSON = function(){
            var result = {};
            for (var item in this) {
                result[item] = this[item];
            }
            delete result['get_sounds'];
            delete result['toJSON'];
            return result;
        };
        return pack;
    };

    var freesound = {

        BASE_URI : "http://www.freesound.org/api",
        apiKey : '',
        debug: false,

        get_from_ref : function(ref, success,error){
            _make_request(ref,success,error,{});
        },

        get_sound : function(soundId, success,error){
            _make_request(_make_uri(URIS.SOUND,[soundId]),success,error,{},_make_sound_object);
        },

        get_user : function(username, success,error){
            _make_request(_make_uri(URIS.USER,[username]),success,error,{},_make_user_object);
        },

        get_pack : function(packId, success,error){
            _make_request(_make_uri(URIS.PACK,[packId]),success,error,{},_make_pack_object);
        },

        quick_search : function(query,success,error){
            freesound.search(query,0,null,null,null,null,null,success,error);
        },

        search: function(query, page, filter, sort, num_results, fields, sounds_per_page, success, error){
            var params = {q:(query ? query : " ")};
            if(page)params.p=page;
            if(filter)params.f = filter;
            if(sort)params.s = sort;
            if(num_results)params.num_results = num_results;
            if(sounds_per_page)params.sounds_per_page = sounds_per_page;
            if(fields)params.fields = fields;
            _make_request(_make_uri(URIS.SEARCH), success,error,params, _make_collection_object);
        },

        content_based_search: function(target, filter, max_results, fields, page, sounds_per_page, success, error){
            var params = {};
            if(page)params.p=page;
            if(filter)params.f = filter;
            if(target)params.t = target;
            if(max_results)params.max_results = max_results;
            if(sounds_per_page)params.sounds_per_page = sounds_per_page;
            if(fields)params.fields = fields;
            _make_request(_make_uri(URIS.CONTENT_SEARCH), success,error,params, _make_collection_object);
        },

        geotag: function(min_lat, max_lat, min_lon, max_lon, page, fields, sounds_per_page, success, error){
            var params = {};
            if(min_lat)params.min_lat=min_lat;
            if(max_lat)params.max_lat=max_lat;
            if(min_lon)params.min_lon=min_lon;
            if(max_lon)params.max_lon=max_lon;
            if(page)params.p=page;
            if(sounds_per_page)params.sounds_per_page = sounds_per_page;
            if(fields)params.fields = fields;
            _make_request(_make_uri(URIS.GEOTAG), success,error,params, _make_collection_object);
        }

    };

    return freesound;

});
