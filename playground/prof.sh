#!/bin/bash

case "$1" in
	"on")
		rm -r output
		./mkln.sh
		pushd "$HOME/.local/bin/"
		ln -sfv purs-prof purs
		popd
		./npm-do.sh pulp build
	;;

	"off")
		rm -r output
		./mkln.sh
		pushd "$HOME/.local/bin/"
		ln -sfv purs-vanilla purs
		popd
		./npm-do.sh pulp build
	;;

	*)
		echo "Usage: $0 <on|off>"
	;;
esac
