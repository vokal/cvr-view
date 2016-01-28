$( function ()
{
    $( "#repo-search" ).on( "input", function ( e )
    {
        var text = $( this ).val();
        var regex = new RegExp( text, "i" );

        $( ".repos > li" ).each( function ()
        {
            var $this = $( this );
            $this.css( "display", regex.test( $this.find( ".repo" ).text() ) ? "" : "none" );
        } );
    } );
} );
