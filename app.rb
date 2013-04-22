
require 'sinatra'
require 'haml'

set :bind, '192.168.137.135'

get '/' do
	haml :index
end

